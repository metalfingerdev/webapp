// The only code that writes stock. Every change writes a `stockAdjustments` row, because when the
// shelf and the app disagree, that log is the only way to find out why.
import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel.js';
import type { MutationCtx } from '../../_generated/server.js';
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
