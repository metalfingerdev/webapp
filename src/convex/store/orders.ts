// Placing, reading, cancelling and returning orders. All of them are the signed-in customer's own
// (requireCustomer, no user argument). An order that is missing and an order that belongs to someone
// else get the same answer, so order numbers cannot be probed.
import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';
import type { MutationCtx, QueryCtx } from '../_generated/server.js';
import { requireCustomer } from '../model/store/access.js';
import { loadCheckoutLines } from '../model/store/checkout.js';
import { findZone } from '../model/store/delivery.js';
import { canCancel, transitionOrder } from '../model/store/orders.js';
import { priceCart } from '../model/store/pricing.js';
import { orderRateLimiter } from '../model/store/rateLimits.js';
import { adjustStock } from '../model/store/stock.js';
import { ONLINE_PAYMENT_ENABLED, PLACEHOLDER_COD_ENABLED } from '../model/store/storeProfile.js';
import {
	addressSnapshot,
	deliveryMethod,
	gstRate,
	orderStatus,
	paymentMethod,
	paymentStatus,
	returnRequest
} from './validators.js';

const NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I: read out over the phone
const newNumber = () =>
	`AK-${Array.from({ length: 8 }, () => NUMBER_ALPHABET[Math.floor(Math.random() * NUMBER_ALPHABET.length)]).join('')}`;

export const MAX_RETURN_REASON = 500;
const DAY = 24 * 60 * 60 * 1000;

const findOwnOrder = async (ctx: QueryCtx | MutationCtx, userId: string, number: string) => {
	const order = await ctx.db
		.query('orders')
		.withIndex('by_number', (q) => q.eq('number', number))
		.unique();
	if (!order || order.userId !== userId) throw new ConvexError('Order not found');
	return order;
};

export const placeOrder = mutation({
	args: { addressId: v.id('addresses'), paymentMethod },
	returns: v.object({ number: v.string() }),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		await orderRateLimiter.limit(ctx, 'placeOrder', { key: user._id, throws: true });

		const settings = await ctx.db.query('storeSettings').first();
		if (settings && !settings.placedOrdersOpen) {
			throw new ConvexError('We are not taking orders right now');
		}
		if (args.paymentMethod === 'cod' && !(settings?.codEnabled ?? PLACEHOLDER_COD_ENABLED)) {
			throw new ConvexError('Cash on delivery is not available');
		}
		if (args.paymentMethod === 'online' && !ONLINE_PAYMENT_ENABLED) {
			throw new ConvexError('Online payment is not available yet');
		}

		const address = await ctx.db.get('addresses', args.addressId);
		if (!address || address.userId !== user._id) throw new ConvexError('Address not found');
		const zone = await findZone(ctx, address.pincode);
		if (!zone) throw new ConvexError('We do not deliver to this pincode yet');

		const cart = await ctx.db
			.query('carts')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.first();
		const { lines, shortages } = await loadCheckoutLines(ctx, cart);
		if (shortages.length > 0) throw new ConvexError(shortages.join('. '));
		if (lines.length === 0) throw new ConvexError('Your cart is empty');

		// Prices come from the database just now, never from the browser
		const price = priceCart(lines, zone);

		let number = newNumber();
		while (
			await ctx.db
				.query('orders')
				.withIndex('by_number', (q) => q.eq('number', number))
				.first()
		) {
			number = newNumber();
		}

		const now = Date.now();
		const orderId = await ctx.db.insert('orders', {
			userId: user._id,
			number,
			status: args.paymentMethod === 'cod' ? 'confirmed' : 'awaiting_payment',
			paymentStatus: 'pending',
			paymentMethod: args.paymentMethod,
			zoneName: zone.name,
			deliveryMethod: zone.method,
			address: {
				name: address.name,
				phone: address.phone,
				line1: address.line1,
				line2: address.line2,
				landmark: address.landmark,
				city: address.city,
				state: address.state,
				pincode: address.pincode
			},
			subtotal: price.subtotal,
			shippingFee: price.shippingFee,
			total: price.total,
			placedAt: now
		});
		for (const line of lines) {
			await ctx.db.insert('orderItems', {
				orderId,
				productId: line.productId,
				variantId: line.variantId,
				title: line.title,
				variantLabel: line.variantLabel === 'Default' ? undefined : line.variantLabel,
				isbn: line.isbn,
				hsn: line.hsn,
				gstRate: line.gstRate,
				unitPrice: line.unitPrice,
				quantity: line.quantity,
				fromSetId: line.fromSetId
			});
			// The shelf was checked above; this holds the stock and logs it
			await adjustStock(ctx, {
				variantId: line.variantId,
				delta: -line.quantity,
				reason: 'order',
				by: user._id,
				orderId
			});
		}
		if (cart) await ctx.db.patch('carts', cart._id, { lines: [], updatedAt: now });
		return { number };
	}
});

const orderSummary = v.object({
	number: v.string(),
	status: orderStatus,
	total: v.number(),
	placedAt: v.number(),
	itemCount: v.number()
});

export const myOrders = query({
	args: {},
	returns: v.array(orderSummary),
	handler: async (ctx) => {
		const user = await requireCustomer(ctx);
		const orders = await ctx.db
			.query('orders')
			.withIndex('by_userId_and_placedAt', (q) => q.eq('userId', user._id))
			.order('desc')
			.take(50);
		const result: (typeof orderSummary.type)[] = [];
		for (const order of orders) {
			const items = await ctx.db
				.query('orderItems')
				.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
				.take(100);
			result.push({
				number: order.number,
				status: order.status,
				total: order.total,
				placedAt: order.placedAt,
				itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
			});
		}
		return result;
	}
});

export const getOrder = query({
	args: { number: v.string() },
	returns: v.object({
		number: v.string(),
		status: orderStatus,
		paymentStatus,
		paymentMethod,
		zoneName: v.string(),
		deliveryMethod,
		address: addressSnapshot,
		subtotal: v.number(),
		shippingFee: v.number(),
		total: v.number(),
		placedAt: v.number(),
		packedAt: v.optional(v.number()),
		shippedAt: v.optional(v.number()),
		deliveredAt: v.optional(v.number()),
		cancelledAt: v.optional(v.number()),
		returnRequest: v.optional(returnRequest),
		/** What the customer may still do */
		canCancel: v.boolean(),
		/** Delivered and not yet asked about; the page also checks `returnBy` against its clock */
		canRequestReturn: v.boolean(),
		/** When the return window closes. Queries cannot read the clock, so the mutation enforces it. */
		returnBy: v.optional(v.number()),
		items: v.array(
			v.object({
				title: v.string(),
				variantLabel: v.optional(v.string()),
				unitPrice: v.number(),
				quantity: v.number(),
				gstRate: gstRate
			})
		),
		shipment: v.union(
			v.null(),
			v.object({
				courier: v.string(),
				awb: v.string(),
				trackingUrl: v.optional(v.string())
			})
		)
	}),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const order = await findOwnOrder(ctx, user._id, args.number);
		const items = await ctx.db
			.query('orderItems')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.take(100);
		const shipment = await ctx.db
			.query('shipments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.first();
		const settings = await ctx.db.query('storeSettings').first();
		return {
			number: order.number,
			status: order.status,
			paymentStatus: order.paymentStatus,
			paymentMethod: order.paymentMethod,
			zoneName: order.zoneName,
			deliveryMethod: order.deliveryMethod,
			address: order.address,
			subtotal: order.subtotal,
			shippingFee: order.shippingFee,
			total: order.total,
			placedAt: order.placedAt,
			packedAt: order.packedAt,
			shippedAt: order.shippedAt,
			deliveredAt: order.deliveredAt,
			cancelledAt: order.cancelledAt,
			returnRequest: order.returnRequest,
			canCancel: canCancel(order.status),
			canRequestReturn: order.status === 'delivered' && order.returnRequest === undefined,
			returnBy:
				order.deliveredAt !== undefined
					? order.deliveredAt + (settings?.returnWindowDays ?? 0) * DAY
					: undefined,
			items: items.map((item) => ({
				title: item.title,
				variantLabel: item.variantLabel,
				unitPrice: item.unitPrice,
				quantity: item.quantity,
				gstRate: item.gstRate
			})),
			shipment: shipment
				? { courier: shipment.courier, awb: shipment.awb, trackingUrl: shipment.trackingUrl }
				: null
		};
	}
});

/** Only a delivered order, once, within the return window (it counts from the delivery) */
const canRequestReturn = (order: Doc<'orders'>, windowDays: number | undefined, now: number) =>
	order.status === 'delivered' &&
	order.returnRequest === undefined &&
	order.deliveredAt !== undefined &&
	now <= order.deliveredAt + (windowDays ?? 0) * DAY;

/** Cancelling twice is fine: the second call changes nothing. */
export const cancelOrder = mutation({
	args: { number: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const order = await findOwnOrder(ctx, user._id, args.number);
		if (order.status === 'cancelled') return null;
		if (!canCancel(order.status)) {
			throw new ConvexError('This order has already left us and can no longer be cancelled');
		}
		await transitionOrder(ctx, order._id, 'cancelled', user._id);
		return null;
	}
});

export const requestReturn = mutation({
	args: { number: v.string(), reason: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const order = await findOwnOrder(ctx, user._id, args.number);
		const reason = args.reason.trim();
		if (!reason || reason.length > MAX_RETURN_REASON) {
			throw new ConvexError(`Tell us why, in up to ${MAX_RETURN_REASON} characters`);
		}
		const settings = await ctx.db.query('storeSettings').first();
		if (!canRequestReturn(order, settings?.returnWindowDays, Date.now())) {
			throw new ConvexError('A return cannot be requested for this order');
		}
		await ctx.db.patch('orders', order._id, {
			returnRequest: { reason, requestedAt: Date.now(), status: 'requested' }
		});
		return null;
	}
});
