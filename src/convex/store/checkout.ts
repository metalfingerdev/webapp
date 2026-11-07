// Checkout preview: the cart priced for one address, so the screen shows what `placeOrder` will
// charge. Read only; `placeOrder` (store/orders.ts) does the pricing again from the same code.
import { v } from 'convex/values';
import { query } from '../_generated/server.js';
import { requireCustomer } from '../model/store/access.js';
import { loadCheckoutLines } from '../model/store/checkout.js';
import { findZone } from '../model/store/delivery.js';
import { priceCart } from '../model/store/pricing.js';
import { ONLINE_PAYMENT_ENABLED, PLACEHOLDER_COD_ENABLED } from '../model/store/storeProfile.js';
import { deliveryMethod } from './validators.js';

export const preview = query({
	args: { addressId: v.optional(v.string()) },
	returns: v.object({
		lines: v.array(
			v.object({
				variantId: v.id('productVariants'),
				title: v.string(),
				variantLabel: v.string(),
				quantity: v.number(),
				unitPrice: v.number(),
				imageUrl: v.union(v.string(), v.null())
			})
		),
		shortages: v.array(v.string()),
		subtotal: v.number(),
		shippingFee: v.number(),
		total: v.number(),
		taxByRate: v.array(v.object({ gstRate: v.number(), taxable: v.number(), tax: v.number() })),
		/** Null until an address is chosen */
		zone: v.union(
			v.null(),
			v.object({ name: v.string(), method: deliveryMethod, estimate: v.string() })
		),
		/** An address was chosen but no zone serves its pincode */
		notDeliverable: v.boolean(),
		cod: v.boolean(),
		online: v.boolean()
	}),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const cart = await ctx.db
			.query('carts')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.first();
		const { lines, shortages } = await loadCheckoutLines(ctx, cart);

		const addressId = args.addressId ? ctx.db.normalizeId('addresses', args.addressId) : null;
		const address = addressId ? await ctx.db.get('addresses', addressId) : null;
		const owned = address && address.userId === user._id ? address : null;
		const zone = owned ? await findZone(ctx, owned.pincode) : null;

		const price = priceCart(lines, zone ?? { fee: 0, freeFrom: 0 });
		const settings = await ctx.db.query('storeSettings').first();
		return {
			lines: lines.map((line) => ({
				variantId: line.variantId,
				title: line.title,
				variantLabel: line.variantLabel,
				quantity: line.quantity,
				unitPrice: line.unitPrice,
				imageUrl: line.imageUrl
			})),
			shortages,
			...price,
			zone: zone ? { name: zone.name, method: zone.method, estimate: zone.estimate } : null,
			notDeliverable: owned !== null && zone === null,
			cod: settings?.codEnabled ?? PLACEHOLDER_COD_ENABLED,
			online: ONLINE_PAYMENT_ENABLED
		};
	}
});
