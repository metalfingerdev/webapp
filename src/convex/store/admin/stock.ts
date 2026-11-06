import { v } from 'convex/values';
import { mutation } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { adjustStock } from '../../model/store/stock.js';
import { manualStockReason } from '../validators.js';

/** Admin: change a variant's stock by hand (goods received, damaged, or a shelf count). */
export const adjust = mutation({
	args: {
		variantId: v.id('productVariants'),
		delta: v.number(),
		reason: manualStockReason
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		return await adjustStock(ctx, { ...args, by: admin._id });
	}
});
