// What a customer may see of a product. Public queries return these shapes and nothing else: no
// purchase price, no exact stock (only "few left" and "out"), no inactive variants. A hidden
// product, variant or category never reaches the customer through here.
import { v, type Infer } from 'convex/values';
import type { Doc } from '../../_generated/dataModel.js';
import type { QueryCtx } from '../../_generated/server.js';
import { productKind } from '../../store/validators.js';

export const availability = v.union(v.literal('in_stock'), v.literal('few_left'), v.literal('out'));
export type Availability = Infer<typeof availability>;

export const productCard = v.object({
	id: v.id('products'),
	title: v.string(),
	slug: v.string(),
	categorySlug: v.string(),
	kind: productKind,
	author: v.optional(v.string()),
	classFrom: v.optional(v.number()),
	classTo: v.optional(v.number()),
	imageUrl: v.union(v.string(), v.null()),
	/** The lowest price among the variants (a uniform's smallest size), in paise */
	price: v.number(),
	/** The MRP of that cheapest variant, in paise */
	mrp: v.number(),
	/** More than one variant, so `price` reads "from" */
	hasSizes: v.boolean(),
	availability
});
export type ProductCard = Infer<typeof productCard>;

export const productDetail = v.object({
	...productCard.fields,
	categoryName: v.string(),
	publisher: v.optional(v.string()),
	isbn: v.optional(v.string()),
	edition: v.optional(v.string()),
	subject: v.optional(v.string()),
	variants: v.array(
		v.object({
			id: v.id('productVariants'),
			label: v.string(),
			price: v.number(),
			mrp: v.number(),
			availability
		})
	)
});
export type ProductDetail = Infer<typeof productDetail>;

export const variantAvailability = (v: Pick<Doc<'productVariants'>, 'stock' | 'lowStockAt'>) =>
	v.stock <= 0 ? 'out' : v.stock <= v.lowStockAt ? 'few_left' : 'in_stock';

/** The best availability across variants: a product is buyable while any size is. */
const bestAvailability = (variants: Doc<'productVariants'>[]): Availability => {
	const all = variants.map(variantAvailability);
	if (all.includes('in_stock')) return 'in_stock';
	if (all.includes('few_left')) return 'few_left';
	return 'out';
};

/** The active variants of a product, in display order. Bounded: a uniform has a few dozen at most. */
export const loadActiveVariants = async (ctx: QueryCtx, productId: Doc<'products'>['_id']) =>
	(
		await ctx.db
			.query('productVariants')
			.withIndex('by_productId_and_sortOrder', (q) => q.eq('productId', productId))
			.take(100)
	).filter((variant) => variant.isActive);

/**
 * The card for a product, or null when it must not be shown: the product is hidden, its category
 * is not in `activeCategories` (hidden, or its parent is), or it has no active variant.
 */
export const toProductCard = async (
	ctx: QueryCtx,
	product: Doc<'products'>,
	activeCategories: Map<Doc<'categories'>['_id'], Doc<'categories'>>
): Promise<ProductCard | null> => {
	const category = activeCategories.get(product.categoryId);
	if (!product.isActive || !category) return null;
	const variants = await loadActiveVariants(ctx, product._id);
	if (variants.length === 0) return null;
	const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a));
	return {
		id: product._id,
		title: product.title,
		slug: product.slug,
		categorySlug: category.slug,
		kind: product.kind,
		author: product.author,
		classFrom: product.classFrom,
		classTo: product.classTo,
		imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
		price: cheapest.price,
		mrp: Math.max(cheapest.mrp, cheapest.price),
		hasSizes: variants.length > 1,
		availability: bestAvailability(variants)
	};
};

export const toProductDetail = async (
	ctx: QueryCtx,
	product: Doc<'products'>,
	activeCategories: Map<Doc<'categories'>['_id'], Doc<'categories'>>
): Promise<ProductDetail | null> => {
	const card = await toProductCard(ctx, product, activeCategories);
	if (!card) return null;
	const variants = await loadActiveVariants(ctx, product._id);
	return {
		...card,
		categoryName: activeCategories.get(product.categoryId)!.name,
		publisher: product.publisher,
		isbn: product.isbn,
		edition: product.edition,
		subject: product.subject,
		variants: variants.map((variant) => ({
			id: variant._id,
			label: variant.label,
			price: variant.price,
			mrp: Math.max(variant.mrp, variant.price),
			availability: variantAvailability(variant)
		}))
	};
};

/** Active categories by id: a category is active only if its parent is too. */
export const loadActiveCategories = async (ctx: QueryCtx) => {
	const all = await ctx.db.query('categories').take(200);
	const byId = new Map(all.map((category) => [category._id, category]));
	const active = new Map<Doc<'categories'>['_id'], Doc<'categories'>>();
	for (const category of all) {
		const parent = category.parentId ? byId.get(category.parentId) : undefined;
		if (category.isActive && (!category.parentId || parent?.isActive)) {
			active.set(category._id, category);
		}
	}
	return active;
};
