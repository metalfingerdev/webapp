import { ConvexError, v } from 'convex/values';
import { mutation } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { adjustStock, setCountedStock } from '../../model/store/stock.js';
import { manualStockReason } from '../validators.js';

/** Admin: goods received (delta above zero) or damaged (below zero). */
export const adjust = mutation({
	args: {
		variantId: v.id('productVariants'),
		delta: v.number(),
		reason: manualStockReason
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		if (args.reason === 'received' && args.delta <= 0) {
			throw new ConvexError('Received stock adds to the shelf');
		}
		if (args.reason === 'damaged' && args.delta >= 0) {
			throw new ConvexError('Damaged stock takes from the shelf');
		}
		return await adjustStock(ctx, { ...args, by: admin._id });
	}
});

/**
 * Admin: a shelf count. Stock becomes the count minus what open orders hold. `shownStock` is the
 * stock the screen showed when counting began; if it has moved since (an order, another admin),
 * the count is refused, because it would no longer mean what the counter saw.
 */
export const count = mutation({
	args: {
		variantId: v.id('productVariants'),
		counted: v.number(),
		shownStock: v.number()
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		const variant = await ctx.db.get('productVariants', args.variantId);
		if (!variant) throw new ConvexError('Variant not found');
		if (variant.stock !== args.shownStock) {
			throw new ConvexError(
				`Stock changed from ${args.shownStock} to ${variant.stock} while you counted. Count again.`
			);
		}
		return await setCountedStock(ctx, {
			variantId: variant._id,
			counted: args.counted,
			reason: 'count',
			by: admin._id
		});
	}
});
