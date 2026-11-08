// Admin: the order board, order search, one order, and the moves staff make (pack, ship, deliver,
// cancel, answer a return). Every function calls requireAppAdmin first. Every status change goes
// through transitionOrder; staff never mark an order paid (only the gateway does, payments.md).
import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Doc } from '../../_generated/dataModel.js';
import { mutation, query, type QueryCtx } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { isAwb, isTrackingUrl } from '../../model/store/couriers.js';
import { transitionOrder } from '../../model/store/orders.js';
import { PAYMENT_WINDOW_MS } from '../../model/store/payments.js';
import { sendShippedEmail } from '../../model/store/shippedEmail.js';
import { orderStatus, type OrderStatus } from '../validators.js';

const OPEN_PER_COLUMN = 100;
const SHIPPED_ON_BOARD = 50;
const TODAY_PER_STATUS = 500;
const SEARCH_RECENT = 300;
const ALL_STATUSES: OrderStatus[] = [
	'awaiting_payment',
	'confirmed',
	'paid',
	'packed',
	'shipped',
	'delivered',
	'cancelled'
];

/** What a board card or a list row shows */
const card = (order: Doc<'orders'>) => ({
	_id: order._id,
	number: order.number,
	status: order.status,
	customer: order.address.name,
	phone: order.address.phone,
	city: order.address.city,
	total: order.total,
	paymentMethod: order.paymentMethod,
	paymentStatus: order.paymentStatus,
	deliveryMethod: order.deliveryMethod,
	placedAt: order.placedAt,
	// When an unpaid online order's payment window closes; the board warns as it nears
	payBy: order.status === 'awaiting_payment' ? order.placedAt + PAYMENT_WINDOW_MS : null,
	returnRequested: order.returnRequest?.status === 'requested'
});

const byStatus = (ctx: QueryCtx, status: OrderStatus, take: number) =>
	ctx.db
		.query('orders')
		.withIndex('by_status_and_placedAt', (q) => q.eq('status', status))
		.order('desc')
		.take(take);

const loadOrder = async (ctx: QueryCtx, number: string) => {
	const order = await ctx.db
		.query('orders')
		.withIndex('by_number', (q) => q.eq('number', number))
		.unique();
	if (!order) throw new ConvexError('Order not found');
	return order;
};

/**
 * The live board: open orders by column, the latest shipped, and today's count and revenue.
 * `dayStart` is midnight in India time, worked out by the client (queries can't read the clock).
 */
export const board = query({
	args: { dayStart: v.number() },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const toPack = [
			...(await byStatus(ctx, 'paid', OPEN_PER_COLUMN)),
			...(await byStatus(ctx, 'confirmed', OPEN_PER_COLUMN))
		].sort((a, b) => a.placedAt - b.placedAt);
		let todayOrders = 0;
		let todayRevenue = 0;
		for (const status of ALL_STATUSES) {
			if (status === 'cancelled') continue;
			const today = await ctx.db
				.query('orders')
				.withIndex('by_status_and_placedAt', (q) =>
					q.eq('status', status).gte('placedAt', args.dayStart)
				)
				.take(TODAY_PER_STATUS);
			todayOrders += today.length;
			// Unpaid online orders aren't revenue yet
			if (status !== 'awaiting_payment') {
				todayRevenue += today.reduce((sum, order) => sum + order.total, 0);
			}
		}
		return {
			awaitingPayment: (await byStatus(ctx, 'awaiting_payment', OPEN_PER_COLUMN)).map(card),
			toPack: toPack.map(card),
			packed: (await byStatus(ctx, 'packed', OPEN_PER_COLUMN)).reverse().map(card),
			shipped: (await byStatus(ctx, 'shipped', SHIPPED_ON_BOARD)).map(card),
			today: { orders: todayOrders, revenue: todayRevenue }
		};
	}
});

/** Orders newest first, all or one status, a page at a time. */
export const list = query({
	args: { paginationOpts: paginationOptsValidator, status: v.optional(orderStatus) },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const { status } = args;
		const result = status
			? await ctx.db
					.query('orders')
					.withIndex('by_status_and_placedAt', (q) => q.eq('status', status))
					.order('desc')
					.paginate(args.paginationOpts)
			: await ctx.db.query('orders').order('desc').paginate(args.paginationOpts);
		return { ...result, page: result.page.map(card) };
	}
});

/**
 * Find orders: an order number exactly, else a phone number or name among the latest orders
 * (there is no index for those, so older orders are found by number).
 */
export const search = query({
	args: { q: v.string() },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const text = args.q.trim();
		if (!text) return [];
		const exact = await ctx.db
			.query('orders')
			.withIndex('by_number', (q) => q.eq('number', text.toUpperCase()))
			.unique();
		if (exact) return [card(exact)];
		const needle = text.toLowerCase();
		const digits = text.replace(/\D/g, '');
		const recent = await ctx.db.query('orders').order('desc').take(SEARCH_RECENT);
		return recent
			.filter(
				(order) =>
					order.number.toLowerCase().includes(needle) ||
					order.address.name.toLowerCase().includes(needle) ||
					(digits.length >= 4 && order.address.phone.replace(/\D/g, '').includes(digits))
			)
			.slice(0, 50)
			.map(card);
	}
});

/** One order with everything staff need: lines, address, payments, shipment and history. */
export const get = query({
	args: { number: v.string() },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const order = await ctx.db
			.query('orders')
			.withIndex('by_number', (q) => q.eq('number', args.number))
			.unique();
		if (!order) return null;
		const items = await ctx.db
			.query('orderItems')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.take(100);
		const payments = await ctx.db
			.query('payments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.take(20);
		const shipment = await ctx.db
			.query('shipments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.first();
		return {
			...order,
			payBy: order.status === 'awaiting_payment' ? order.placedAt + PAYMENT_WINDOW_MS : null,
			items: items.map((item) => ({
				_id: item._id,
				title: item.title,
				variantLabel: item.variantLabel ?? null,
				isbn: item.isbn ?? null,
				unitPrice: item.unitPrice,
				quantity: item.quantity,
				fromSet: item.fromSetId !== undefined
			})),
			payments: payments.map((payment) => ({
				_id: payment._id,
				amount: payment.amount,
				status: payment.status,
				gatewayPaymentId: payment.gatewayPaymentId ?? null,
				refund: payment.refund ?? null,
				createdAt: payment.createdAt
			})),
			shipment: shipment
				? {
						courier: shipment.courier,
						awb: shipment.awb,
						trackingUrl: shipment.trackingUrl ?? null,
						shippedAt: shipment.shippedAt
					}
				: null
		};
	}
});

/** Packed and ready for the courier. Only a paid, or a confirmed cash-on-delivery, order. */
export const markPacked = mutation({
	args: { number: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		const order = await loadOrder(ctx, args.number);
		await transitionOrder(ctx, order._id, 'packed', admin._id);
		return null;
	}
});

/**
 * Handed to the courier (courier zone: courier and AWB required, one shipment per order) or out for
 * local delivery (neither needed). Emails the customer when email is set up.
 */
export const markShipped = mutation({
	args: {
		number: v.string(),
		courier: v.optional(v.string()),
		awb: v.optional(v.string()),
		trackingUrl: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		const order = await loadOrder(ctx, args.number);
		if (order.status === 'shipped') return null;
		const courier = args.courier?.trim() || undefined;
		const awb = args.awb?.trim() || undefined;
		const trackingUrl = args.trackingUrl?.trim() || undefined;
		if (order.deliveryMethod === 'courier' && (!courier || !awb)) {
			throw new ConvexError('Enter the courier and the AWB number');
		}
		if (courier && courier.length > 40) throw new ConvexError('The courier name is too long');
		if (awb && !isAwb(awb)) throw new ConvexError('The AWB is 4 to 40 letters, digits or dashes');
		if (awb && !courier) throw new ConvexError('Enter the courier for this AWB');
		if (trackingUrl && !isTrackingUrl(trackingUrl)) {
			throw new ConvexError('The tracking link must be an https address');
		}
		const existing = await ctx.db
			.query('shipments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.first();
		if (existing) throw new ConvexError('This order already has a shipment');

		await transitionOrder(ctx, order._id, 'shipped', admin._id);
		if (courier && awb) {
			await ctx.db.insert('shipments', {
				orderId: order._id,
				courier,
				awb,
				trackingUrl,
				shippedAt: Date.now()
			});
		}
		await sendShippedEmail(ctx, {
			userId: order.userId,
			orderNumber: order.number,
			courier,
			awb,
			trackingUrl
		});
		return null;
	}
});

/** Arrived. A cash-on-delivery order becomes paid here (transitionOrder). */
export const markDelivered = mutation({
	args: { number: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		const order = await loadOrder(ctx, args.number);
		await transitionOrder(ctx, order._id, 'delivered', admin._id);
		const shipment = await ctx.db
			.query('shipments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.first();
		if (shipment && !shipment.deliveredAt) {
			await ctx.db.patch('shipments', shipment._id, { deliveredAt: Date.now() });
		}
		return null;
	}
});

/** Cancels before shipping: stock goes back, a paid online order is refunded (once). */
export const cancel = mutation({
	args: { number: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		const order = await loadOrder(ctx, args.number);
		await transitionOrder(ctx, order._id, 'cancelled', admin._id);
		return null;
	}
});

/** Approves or rejects a customer's return request. The refund itself is handled by hand for now. */
export const answerReturn = mutation({
	args: { number: v.string(), approve: v.boolean() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const order = await loadOrder(ctx, args.number);
		if (order.returnRequest?.status !== 'requested') {
			throw new ConvexError('There is no open return request on this order');
		}
		await ctx.db.patch('orders', order._id, {
			returnRequest: { ...order.returnRequest, status: args.approve ? 'approved' : 'rejected' }
		});
		return null;
	}
});
