// The only code that writes stock. Every change writes a `stockAdjustments` row, because when the
// shelf and the app disagree, that log is the only way to find out why.
import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel.js';
import type { MutationCtx, QueryCtx } from '../../_generated/server.js';
import type { StockReason } from '../../store/validators.js';

export const adjustStock = async (
	ctx: MutationCtx,
	args: {
		variantId: Id<'productVariants'>;
		delta: number;
		reason: StockReason;
		/** The admin's user id, or "system" for checkout, cancel and import. */
		by: string;
		orderId?: Id<'orders'>;
	}
): Promise<number> => {
	if (!Number.isInteger(args.delta) || args.delta === 0) {
		throw new ConvexError('Stock changes by a whole number other than zero');
	}
	const variant = await ctx.db.get('productVariants', args.variantId);
	if (!variant) throw new ConvexError('Variant not found');

	const stockAfter = variant.stock + args.delta;
	if (stockAfter < 0) {
		throw new ConvexError(`Only ${variant.stock} in stock`);
	}

	await ctx.db.patch('productVariants', variant._id, { stock: stockAfter });
	await ctx.db.insert('stockAdjustments', {
		variantId: variant._id,
		productId: variant.productId,
		delta: args.delta,
		stockAfter,
		reason: args.reason,
		orderId: args.orderId,
		by: args.by,
		at: Date.now()
	});
	return stockAfter;
};

/** Orders whose goods are still on the shelf: stock is already taken off, the parcel hasn't left. */
const ON_SHELF_STATUSES = new Set(['awaiting_payment', 'confirmed', 'paid', 'packed']);

/** Order lines read per variant when working out what open orders hold. Open orders are recent. */
const HELD_SCAN_LIMIT = 500;

/**
 * How many of a variant open orders hold: placed and taken off stock, but not shipped yet, so
 * still physically on the shelf. A shelf count includes them; stock must not.
 */
export const heldByOpenOrders = async (
	ctx: QueryCtx,
	variantId: Id<'productVariants'>
): Promise<number> => {
	const lines = await ctx.db
		.query('orderItems')
		.withIndex('by_variantId', (q) => q.eq('variantId', variantId))
		.order('desc')
		.take(HELD_SCAN_LIMIT);
	let held = 0;
	const statusOf = new Map<Id<'orders'>, string | undefined>();
	for (const line of lines) {
		if (!statusOf.has(line.orderId)) {
			statusOf.set(line.orderId, (await ctx.db.get('orders', line.orderId))?.status);
		}
		if (ON_SHELF_STATUSES.has(statusOf.get(line.orderId) ?? '')) held += line.quantity;
	}
	return held;
};

/**
 * Sets stock from a shelf count: the count minus what open orders hold. Refused when it would go
 * below zero (the shelf holds less than orders already took). Returns the new stock.
 */
export const setCountedStock = async (
	ctx: MutationCtx,
	args: {
		variantId: Id<'productVariants'>;
		counted: number;
		reason: 'count' | 'import';
		by: string;
	}
): Promise<number> => {
	if (!Number.isInteger(args.counted) || args.counted < 0) {
		throw new ConvexError('A count is a whole number, zero or more');
	}
	const variant = await ctx.db.get('productVariants', args.variantId);
	if (!variant) throw new ConvexError('Variant not found');
	const held = await heldByOpenOrders(ctx, variant._id);
	const target = args.counted - held;
	if (target < 0) {
		throw new ConvexError(
			`Counted ${args.counted}, but open orders hold ${held}. Check the shelf and the orders.`
		);
	}
	if (target === variant.stock) return target;
	return adjustStock(ctx, {
		variantId: variant._id,
		delta: target - variant.stock,
		reason: args.reason,
		by: args.by
	});
};
