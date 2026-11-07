// The cart as an order would see it: live prices, tax details, and what the shelf cannot cover.
// Shared by the checkout preview and `placeOrder`, so the two read the cart the same way.
import type { Doc, Id } from '../../_generated/dataModel.js';
import type { QueryCtx } from '../../_generated/server.js';
import type { GstRate } from '../../store/validators.js';
import { loadActiveCategories } from './publicProjection.js';

export type CheckoutLine = {
	productId: Id<'products'>;
	variantId: Id<'productVariants'>;
	title: string;
	variantLabel: string;
	isbn?: string;
	hsn: string;
	gstRate: GstRate;
	unitPrice: number;
	quantity: number;
	fromSetId?: Id<'schoolSets'>;
	imageUrl: string | null;
};

export const loadCheckoutLines = async (ctx: QueryCtx, cart: Doc<'carts'> | null) => {
	const categories = await loadActiveCategories(ctx);
	const lines: CheckoutLine[] = [];
	/** Lines the customer must fix first: sold out, or more in the cart than the shelf holds */
	const shortages: string[] = [];
	for (const line of cart?.lines ?? []) {
		const variant = await ctx.db.get('productVariants', line.variantId);
		const product = variant?.isActive ? await ctx.db.get('products', variant.productId) : null;
		if (!variant || !product || !product.isActive || !categories.has(product.categoryId)) continue;
		if (variant.stock < line.quantity) {
			shortages.push(
				variant.stock <= 0
					? `${product.title} is out of stock`
					: `${product.title}: only ${variant.stock} left`
			);
			continue;
		}
		lines.push({
			productId: product._id,
			variantId: variant._id,
			title: product.title,
			variantLabel: variant.label,
			isbn: product.isbn,
			hsn: product.hsn,
			gstRate: product.gstRate,
			unitPrice: variant.price,
			quantity: line.quantity,
			fromSetId: line.fromSetId,
			imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null
		});
	}
	return { lines, shortages };
};
