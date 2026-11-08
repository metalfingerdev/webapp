// Paying for an online order with Razorpay (.agents/skills/store-app/references/payments.md).
// The browser never says what to charge or that an order is paid: the amount comes from the stored
// order total, and an order turns paid only on the gateway's word (signed webhook, or a server-side
// status check after the customer returns).
import { ConvexError, v } from 'convex/values';
import { internal } from '../_generated/api.js';
import type { Id } from '../_generated/dataModel.js';
import { action, internalAction, internalMutation, internalQuery } from '../_generated/server.js';
import type { ActionCtx } from '../_generated/server.js';
import { requireCustomer } from '../model/store/access.js';
import { transitionOrder } from '../model/store/orders.js';
import { PAYMENT_WINDOW_MS, settleCapture } from '../model/store/payments.js';
import { razorpayApi, signatureMatches } from '../model/store/razorpay.js';
import { applyRefund } from '../model/store/refunds.js';
import { STORE_NAME } from '../model/store/storeProfile.js';
import { refundStatus } from './validators.js';

/** Attempts per order before we ask the customer to call us instead */
const MAX_ATTEMPTS = 10;

const checkoutDetails = v.object({
	keyId: v.string(), // public by design: Razorpay Checkout needs it in the browser
	gatewayOrderId: v.string(),
	amount: v.number(),
	number: v.string(),
	storeName: v.string(),
	name: v.string(),
	phone: v.string(),
	/** Seconds left in the payment window, for Checkout's own timeout */
	secondsLeft: v.number()
});

/**
 * Guard: requireCustomer. Saves the attempt as `creating` before the gateway is asked; reuses an
 * attempt that already has a gateway order for the same amount (a customer retrying after closing
 * the payment window).
 */
export const beginAttempt = internalMutation({
	args: { number: v.string() },
	returns: v.object({
		paymentId: v.id('payments'),
		gatewayOrderId: v.union(v.string(), v.null()),
		amount: v.number(),
		number: v.string(),
		name: v.string(),
		phone: v.string(),
		secondsLeft: v.number()
	}),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const order = await ctx.db
			.query('orders')
			.withIndex('by_number', (q) => q.eq('number', args.number))
			.unique();
		if (!order || order.userId !== user._id) throw new ConvexError('Order not found');
		if (order.paymentMethod !== 'online' || order.status !== 'awaiting_payment') {
			throw new ConvexError('This order is not waiting for payment');
		}
		const msLeft = order.placedAt + PAYMENT_WINDOW_MS - Date.now();
		if (msLeft <= 0) {
			throw new ConvexError('The time to pay for this order has run out. Please order again.');
		}

		const attempts = await ctx.db
			.query('payments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.take(MAX_ATTEMPTS);
		const base = {
			amount: order.total,
			number: order.number,
			name: order.address.name,
			phone: order.address.phone,
			secondsLeft: Math.max(60, Math.floor(msLeft / 1000))
		};
		const reusable = attempts.find(
			(p) =>
				p.gatewayOrderId !== undefined &&
				p.amount === order.total &&
				(p.status === 'created' || p.status === 'failed')
		);
		if (reusable) {
			await ctx.db.patch('payments', reusable._id, { status: 'created' });
			return { ...base, paymentId: reusable._id, gatewayOrderId: reusable.gatewayOrderId! };
		}
		if (attempts.length >= MAX_ATTEMPTS) {
			throw new ConvexError('Too many payment attempts for this order. Please call us.');
		}
		const paymentId = await ctx.db.insert('payments', {
			orderId: order._id,
			amount: order.total,
			status: 'creating',
			createdAt: Date.now()
		});
		return { ...base, paymentId, gatewayOrderId: null };
	}
});

export const recordGatewayOrder = internalMutation({
	args: { paymentId: v.id('payments'), gatewayOrderId: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch('payments', args.paymentId, {
			gatewayOrderId: args.gatewayOrderId,
			status: 'created'
		});
		return null;
	}
});

/** The signed-in customer starts paying for their order; returns what Razorpay Checkout needs. */
export const start = action({
	args: { number: v.string() },
	returns: checkoutDetails,
	handler: async (ctx, args): Promise<typeof checkoutDetails.type> => {
		// The guard (requireCustomer) runs inside beginAttempt, with this caller's identity
		const attempt = await ctx.runMutation(internal.store.payments.beginAttempt, args);
		const keyId = process.env.RAZORPAY_KEY_ID;
		if (!keyId) throw new ConvexError('Online payment is not set up');
		let gatewayOrderId = attempt.gatewayOrderId;
		if (!gatewayOrderId) {
			try {
				const created = await razorpayApi<{ id: string }>('/orders', {
					method: 'POST',
					body: {
						amount: attempt.amount,
						currency: 'INR',
						receipt: attempt.number,
						notes: { orderNumber: attempt.number }
					}
				});
				gatewayOrderId = created.id;
			} catch (error) {
				console.error(error);
				throw new ConvexError('We could not reach the payment service. Please try again.');
			}
			await ctx.runMutation(internal.store.payments.recordGatewayOrder, {
				paymentId: attempt.paymentId,
				gatewayOrderId
			});
		}
		return {
			keyId,
			gatewayOrderId,
			amount: attempt.amount,
			number: attempt.number,
			storeName: STORE_NAME,
			name: attempt.name,
			phone: attempt.phone,
			secondsLeft: attempt.secondsLeft
		};
	}
});

export const settle = internalMutation({
	args: { gatewayOrderId: v.string(), gatewayPaymentId: v.string(), amount: v.number() },
	returns: v.string(),
	handler: async (ctx, args) => await settleCapture(ctx, args)
});

/**
 * After Razorpay Checkout succeeds, so the customer sees "paid" without waiting for the webhook.
 * Deliberately public: it changes nothing unless the signature, made with our key secret, matches
 * and Razorpay itself says the payment was captured. The webhook still settles it otherwise.
 */
export const confirm = action({
	args: { gatewayOrderId: v.string(), gatewayPaymentId: v.string(), signature: v.string() },
	returns: v.union(v.literal('paid'), v.literal('pending')),
	handler: async (ctx, args): Promise<'paid' | 'pending'> => {
		const secret = process.env.RAZORPAY_KEY_SECRET;
		const valid =
			secret !== undefined &&
			(await signatureMatches(
				secret,
				`${args.gatewayOrderId}|${args.gatewayPaymentId}`,
				args.signature
			));
		if (!valid) throw new ConvexError('We could not verify this payment');

		const payment = await razorpayApi<{ status: string; order_id: string; amount: number }>(
			`/payments/${encodeURIComponent(args.gatewayPaymentId)}`
		);
		if (payment.order_id !== args.gatewayOrderId) {
			throw new ConvexError('We could not verify this payment');
		}
		if (payment.status !== 'captured') return 'pending';
		const outcome: string = await ctx.runMutation(internal.store.payments.settle, {
			gatewayOrderId: args.gatewayOrderId,
			gatewayPaymentId: args.gatewayPaymentId,
			amount: payment.amount
		});
		return outcome === 'paid' || outcome === 'already' ? 'paid' : 'pending';
	}
});

/** Scheduled by placeOrder: an online order still unpaid after the window is cancelled. */
export const expire = internalMutation({
	args: { orderId: v.id('orders') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const order = await ctx.db.get('orders', args.orderId);
		if (order?.status === 'awaiting_payment') {
			await transitionOrder(ctx, order._id, 'cancelled', 'system');
		}
		return null;
	}
});

/** One verified webhook event. Keyed on the gateway's event id, so a resend does nothing. */
export const handleEvent = internalMutation({
	args: {
		eventId: v.string(),
		type: v.string(),
		gatewayOrderId: v.optional(v.string()),
		gatewayPaymentId: v.optional(v.string()),
		amount: v.optional(v.number()),
		gatewayRefundId: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const seen = await ctx.db
			.query('paymentEvents')
			.withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
			.first();
		if (seen) return null;
		await ctx.db.insert('paymentEvents', {
			eventId: args.eventId,
			type: args.type,
			at: Date.now()
		});

		const { gatewayOrderId, gatewayPaymentId, amount } = args;
		if (args.type === 'payment.captured' || args.type === 'order.paid') {
			if (gatewayOrderId && gatewayPaymentId && amount !== undefined) {
				await settleCapture(ctx, { gatewayOrderId, gatewayPaymentId, amount });
			}
		} else if (args.type === 'payment.failed' && gatewayOrderId) {
			const payment = await ctx.db
				.query('payments')
				.withIndex('by_gatewayOrderId', (q) => q.eq('gatewayOrderId', gatewayOrderId))
				.first();
			if (payment?.status === 'created') {
				await ctx.db.patch('payments', payment._id, { status: 'failed' });
			}
		} else if (
			(args.type === 'refund.processed' || args.type === 'refund.failed') &&
			gatewayPaymentId
		) {
			const payment = await ctx.db
				.query('payments')
				.withIndex('by_gatewayPaymentId', (q) => q.eq('gatewayPaymentId', gatewayPaymentId))
				.first();
			if (payment) {
				await applyRefund(ctx, payment, {
					status: args.type === 'refund.processed' ? 'processed' : 'failed',
					gatewayRefundId: args.gatewayRefundId
				});
			} else {
				console.warn(`Refund event for an unknown payment ${gatewayPaymentId}`);
			}
		}
		return null;
	}
});

export const refundTarget = internalQuery({
	args: { paymentId: v.id('payments') },
	returns: v.union(
		v.null(),
		v.object({ gatewayPaymentId: v.string(), amount: v.number(), orderNumber: v.string() })
	),
	handler: async (ctx, args) => {
		const payment = await ctx.db.get('payments', args.paymentId);
		// Only a refund that was started and not yet sent to the gateway
		if (!payment?.gatewayPaymentId || payment.refund?.status !== 'pending') return null;
		if (payment.refund.gatewayRefundId) return null;
		const order = await ctx.db.get('orders', payment.orderId);
		return {
			gatewayPaymentId: payment.gatewayPaymentId,
			amount: payment.refund.amount,
			orderNumber: order?.number ?? ''
		};
	}
});

export const recordRefund = internalMutation({
	args: {
		paymentId: v.id('payments'),
		status: refundStatus,
		gatewayRefundId: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const payment = await ctx.db.get('payments', args.paymentId);
		if (payment) await applyRefund(ctx, payment, args);
		return null;
	}
});

/** Scheduled by startRefund (model/store/refunds.ts). Asks Razorpay to send the money back. */
export const sendRefund = internalAction({
	args: { paymentId: v.id('payments') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const target = await ctx.runQuery(internal.store.payments.refundTarget, args);
		if (!target) return null;
		await refundAtGateway(ctx, args.paymentId, target);
		return null;
	}
});

const refundAtGateway = async (
	ctx: ActionCtx,
	paymentId: Id<'payments'>,
	target: { gatewayPaymentId: string; amount: number; orderNumber: string }
) => {
	try {
		const refund = await razorpayApi<{ id: string; status: string }>(
			`/payments/${encodeURIComponent(target.gatewayPaymentId)}/refund`,
			{
				method: 'POST',
				body: { amount: target.amount, notes: { orderNumber: target.orderNumber } }
			}
		);
		await ctx.runMutation(internal.store.payments.recordRefund, {
			paymentId,
			gatewayRefundId: refund.id,
			status: refund.status === 'processed' ? 'processed' : 'pending'
		});
	} catch (error) {
		// Left visible as failed in the admin payments list; the shop refunds it by hand
		console.error(error);
		await ctx.runMutation(internal.store.payments.recordRefund, { paymentId, status: 'failed' });
	}
};
