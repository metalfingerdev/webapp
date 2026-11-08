// Admin: the catalogue. Every function calls requireAppAdmin first. Products are hidden, never
// deleted, because orders and sets point at them.
import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Doc, Id } from '../../_generated/dataModel.js';
import { mutation, query, type QueryCtx } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import {
	checkProduct,
	checkVariant,
	nextVariantSort,
	productInput,
	uniqueProductSlug,
	variantInput
} from '../../model/store/products.js';
import { heldByOpenOrders } from '../../model/store/stock.js';

/** Stock at or below this is scanned for the low-stock filter; a product's own level decides. */
const LOW_STOCK_SCAN_MAX = 100;
const SEARCH_LIMIT = 30;
const VARIANTS_PER_PRODUCT = 50;
const LOG_PER_VARIANT = 20;

const variantSummary = (variant: Doc<'productVariants'>) => ({
	_id: variant._id,
	label: variant.label,
	sku: variant.sku ?? null,
	price: variant.price,
	mrp: variant.mrp,
	stock: variant.stock,
	lowStockAt: variant.lowStockAt,
	isActive: variant.isActive
});

const variantsOf = (ctx: QueryCtx, productId: Id<'products'>) =>
	ctx.db
		.query('productVariants')
		.withIndex('by_productId_and_sortOrder', (q) => q.eq('productId', productId))
		.take(VARIANTS_PER_PRODUCT);

/** A list row: the product with its sizes (or only the sizes a stock filter matched). */
const listRow = async (
	ctx: QueryCtx,
	product: Doc<'products'>,
	categoryNames: Map<Id<'categories'>, string>,
	variants?: Doc<'productVariants'>[]
) => {
	if (!categoryNames.has(product.categoryId)) {
		const category = await ctx.db.get('categories', product.categoryId);
		categoryNames.set(product.categoryId, category?.name ?? '');
	}
	return {
		_id: product._id,
		title: product.title,
		kind: product.kind,
		isActive: product.isActive,
		category: categoryNames.get(product.categoryId) ?? '',
		imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
		variants: (variants ?? (await variantsOf(ctx, product._id))).map(variantSummary)
	};
};

/** Categories (hidden too) and schools, for the filters and the product form. */
export const options = query({
	args: {},
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const categories = await ctx.db.query('categories').take(200);
		const schools = await ctx.db.query('schools').withIndex('by_sortOrder').take(100);
		return {
			categories: categories.map((c) => ({
				_id: c._id,
				name: c.name,
				parentId: c.parentId ?? null,
				isActive: c.isActive
			})),
			schools: schools.map((s) => ({ _id: s._id, name: s.name }))
		};
	}
});

/**
 * The catalogue, newest first. `stock: 'low' | 'out'` lists the sizes that need restocking
 * instead (one row per product, holding only those sizes).
 */
export const list = query({
	args: {
		paginationOpts: paginationOptsValidator,
		categoryId: v.optional(v.id('categories')),
		status: v.union(v.literal('all'), v.literal('active'), v.literal('hidden')),
		stock: v.union(v.literal('any'), v.literal('low'), v.literal('out'))
	},
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const names = new Map<Id<'categories'>, string>();
		const keep = (product: Doc<'products'> | null): product is Doc<'products'> =>
			!!product &&
			(!args.categoryId || product.categoryId === args.categoryId) &&
			(args.status === 'all' || product.isActive === (args.status === 'active'));

		if (args.stock !== 'any') {
			const result =
				args.stock === 'out'
					? await ctx.db
							.query('productVariants')
							.withIndex('by_stock', (q) => q.eq('stock', 0))
							.filter((q) => q.eq(q.field('isActive'), true))
							.paginate(args.paginationOpts)
					: await ctx.db
							.query('productVariants')
							.withIndex('by_stock', (q) => q.lte('stock', LOW_STOCK_SCAN_MAX))
							.filter((q) =>
								q.and(
									q.eq(q.field('isActive'), true),
									q.lte(q.field('stock'), q.field('lowStockAt'))
								)
							)
							.paginate(args.paginationOpts);
			const byProduct = new Map<Id<'products'>, Doc<'productVariants'>[]>();
			for (const variant of result.page) {
				byProduct.set(variant.productId, [...(byProduct.get(variant.productId) ?? []), variant]);
			}
			const page = [];
			for (const [productId, variants] of byProduct) {
				const product = await ctx.db.get('products', productId);
				if (keep(product)) page.push(await listRow(ctx, product, names, variants));
			}
			return { ...result, page };
		}

		const { categoryId, status } = args;
		const products = categoryId
			? status === 'all'
				? ctx.db
						.query('products')
						.withIndex('by_categoryId_and_isActive', (q) => q.eq('categoryId', categoryId))
				: ctx.db
						.query('products')
						.withIndex('by_categoryId_and_isActive', (q) =>
							q.eq('categoryId', categoryId).eq('isActive', status === 'active')
						)
			: status === 'all'
				? ctx.db.query('products')
				: ctx.db
						.query('products')
						.withIndex('by_isActive', (q) => q.eq('isActive', status === 'active'));
		const result = await products.order('desc').paginate(args.paginationOpts);
		const page = [];
		for (const product of result.page) page.push(await listRow(ctx, product, names));
		return { ...result, page };
	}
});

/** Search by title, author, publisher, ISBN or subject; hidden products included. */
export const search = query({
	args: { q: v.string() },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const text = args.q.trim();
		if (!text) return [];
		const products = await ctx.db
			.query('products')
			.withSearchIndex('search_text', (q) => q.search('searchText', text))
			.take(SEARCH_LIMIT);
		const names = new Map<Id<'categories'>, string>();
		const rows = [];
		for (const product of products) rows.push(await listRow(ctx, product, names));
		return rows;
	}
});

/** One product for the edit screen: every size, its exact stock, what open orders hold, its log. */
export const get = query({
	args: { productId: v.id('products') },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const product = await ctx.db.get('products', args.productId);
		if (!product) return null;
		const variants = [];
		for (const variant of await variantsOf(ctx, product._id)) {
			const log = await ctx.db
				.query('stockAdjustments')
				.withIndex('by_variantId_and_at', (q) => q.eq('variantId', variant._id))
				.order('desc')
				.take(LOG_PER_VARIANT);
			variants.push({
				...variant,
				held: await heldByOpenOrders(ctx, variant._id),
				log: log.map((entry) => ({
					_id: entry._id,
					delta: entry.delta,
					stockAfter: entry.stockAfter,
					reason: entry.reason,
					orderId: entry.orderId ?? null,
					byAdmin: entry.by !== 'system',
					at: entry.at
				}))
			});
		}
		return {
			...product,
			imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
			variants
		};
	}
});

/** Creates a product with its first size. Stock starts at zero: receive it on the stock panel. */
export const create = mutation({
	args: { product: productInput, variant: variantInput },
	returns: v.id('products'),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const product = await checkProduct(ctx, args.product);
		const variant = await checkVariant(ctx, args.variant);
		const productId = await ctx.db.insert('products', {
			...product,
			slug: await uniqueProductSlug(ctx, product.title),
			isActive: true
		});
		await ctx.db.insert('productVariants', {
			...variant,
			productId,
			stock: 0,
			sortOrder: 1
		});
		return productId;
	}
});

/** Edits a product. The slug never changes. A replaced image is removed from storage. */
export const update = mutation({
	args: { productId: v.id('products'), product: productInput },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const existing = await ctx.db.get('products', args.productId);
		if (!existing) throw new ConvexError('Product not found');
		const product = await checkProduct(ctx, args.product);
		// replace (not patch) so a cleared optional field is really cleared
		await ctx.db.replace('products', existing._id, {
			slug: existing.slug,
			isActive: existing.isActive,
			...product
		});
		if (existing.imageId && existing.imageId !== product.imageId) {
			await ctx.storage.delete(existing.imageId);
		}
		return null;
	}
});

export const setActive = mutation({
	args: { productId: v.id('products'), isActive: v.boolean() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		if (!(await ctx.db.get('products', args.productId))) throw new ConvexError('Product not found');
		await ctx.db.patch('products', args.productId, { isActive: args.isActive });
		return null;
	}
});

/** Adds a size (no `variantId`) or edits one. Never touches stock: that is the stock panel. */
export const saveVariant = mutation({
	args: {
		productId: v.id('products'),
		variantId: v.optional(v.id('productVariants')),
		variant: variantInput
	},
	returns: v.id('productVariants'),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		if (!(await ctx.db.get('products', args.productId))) throw new ConvexError('Product not found');
		const fields = await checkVariant(ctx, args.variant, args.variantId);
		if (args.variantId) {
			const existing = await ctx.db.get('productVariants', args.variantId);
			if (!existing || existing.productId !== args.productId) {
				throw new ConvexError('Size not found');
			}
			await ctx.db.replace('productVariants', existing._id, {
				...fields,
				productId: existing.productId,
				stock: existing.stock,
				sortOrder: existing.sortOrder
			});
			return existing._id;
		}
		return await ctx.db.insert('productVariants', {
			...fields,
			productId: args.productId,
			stock: 0,
			sortOrder: await nextVariantSort(ctx, args.productId)
		});
	}
});

/** A one-time URL to upload a product photo to Convex storage. */
export const imageUploadUrl = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		return await ctx.storage.generateUploadUrl();
	}
});

const EXPORT_PAGE = 200;

/** One page of every size with its product, for the CSV export. The client walks the pages. */
export const exportPage = query({
	args: { cursor: v.union(v.string(), v.null()) },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const result = await ctx.db
			.query('productVariants')
			.paginate({ cursor: args.cursor, numItems: EXPORT_PAGE });
		const products = new Map<Id<'products'>, Doc<'products'> | null>();
		const categories = new Map<Id<'categories'>, string>();
		const rows = [];
		for (const variant of result.page) {
			if (!products.has(variant.productId)) {
				products.set(variant.productId, await ctx.db.get('products', variant.productId));
			}
			const product = products.get(variant.productId);
			if (!product) continue;
			if (!categories.has(product.categoryId)) {
				categories.set(
					product.categoryId,
					(await ctx.db.get('categories', product.categoryId))?.name ?? ''
				);
			}
			rows.push({
				sku: variant.sku ?? '',
				title: product.title,
				size: variant.label,
				category: categories.get(product.categoryId) ?? '',
				kind: product.kind,
				isbn: product.isbn ?? '',
				hsn: product.hsn,
				gstRate: product.gstRate,
				mrp: variant.mrp,
				price: variant.price,
				purchasePrice: variant.purchasePrice ?? null,
				stock: variant.stock,
				active: product.isActive && variant.isActive
			});
		}
		return { rows, cursor: result.continueCursor, isDone: result.isDone };
	}
});
