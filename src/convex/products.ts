// convex/products.ts
import { query, mutation } from './_generated/server.js';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

export const getProducts = query({
	args: {
		paginationOpts: paginationOptsValidator,
		category: v.optional(v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')))
	},
	handler: async (ctx, args) => {
		const q = ctx.db.query('products');

		if (args.category) {
			return await q
				.withIndex('by_category', (q) => q.eq('category', args.category!))
				.paginate(args.paginationOpts);
		}

		return await q.order('desc').paginate(args.paginationOpts);
	}
});

export const getProductById = query({
	// Use v.id('products') instead of v.string()
	args: { id: v.id('products') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

// Public product lookup by URL slug — backs the SSR product page so the raw
// Convex id never has to appear in the URL.
export const getProductBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		return await ctx.db
			.query('products')
			.withIndex('by_slug', (q) => q.eq('slug', slug))
			.first();
	}
});

// Live search-as-you-type suggestions for the navbar search. Public, capped
// small — backs the Apple-style autocomplete, not a full results page.
export const searchProducts = query({
	args: { term: v.string() },
	handler: async (ctx, { term }) => {
		const q = term.trim();
		if (!q) return [];
		const results = await ctx.db
			.query('products')
			.withSearchIndex('search_name', (s) => s.search('searchText', q))
			.take(8);
		return results.map((p) => ({
			_id: p._id,
			name: p.name,
			category: p.category,
			slug: p.slug ?? ''
		}));
	}
});

// Paginated full-text search backing the /shop?q=... results page (the navbar's
// searchProducts is capped for autocomplete; this one pages through everything).
export const searchProductsPaginated = query({
	args: { term: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (ctx, { term, paginationOpts }) => {
		const q = term.trim();
		if (!q) return { page: [], isDone: true, continueCursor: '' };
		return await ctx.db
			.query('products')
			.withSearchIndex('search_name', (s) => s.search('searchText', q))
			.paginate(paginationOpts);
	}
});

// Minimal projection of every product for building sitemap.xml. Public.
export const getSitemapEntries = query({
	args: {},
	handler: async (ctx) => {
		const products = await ctx.db.query('products').collect();
		return products
			.filter((p) => p.slug)
			.map((p) => ({ category: p.category, slug: p.slug as string }));
	}
});

// (Superseded by bundle.ts — the old getSchoolProducts used the flat bundle
// model and is replaced by getBundle / getSchoolBundles there.)

// Backs the /shop and /shop/[category] grids with all filters applied
// server-side. Chooses an access path from the active filters so each maps to an
// index: full-text search, price-ordered (sort/range), or creation order.
export const listShopProducts = query({
	args: {
		paginationOpts: paginationOptsValidator,
		category: v.optional(v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary'))),
		q: v.optional(v.string()),
		sort: v.optional(
			v.union(
				v.literal('relevance'),
				v.literal('price-asc'),
				v.literal('price-desc'),
				v.literal('newest')
			)
		),
		minPaise: v.optional(v.number()),
		maxPaise: v.optional(v.number()),
		inStockOnly: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const { category, paginationOpts, minPaise, maxPaise, inStockOnly } = args;
		const term = args.q?.trim();
		const sort = args.sort ?? 'relevance';
		const priceSort = sort === 'price-asc' || sort === 'price-desc';
		const hasRange = minPaise != null || maxPaise != null;

		// 1) Text search.
		if (term) {
			const search = ctx.db.query('products').withSearchIndex('search_name', (s) => {
				const b = s.search('searchText', term);
				return category ? b.eq('category', category) : b;
			});

			// Default: relevance order — let Convex paginate the search index, with
			// price/stock applied as filters.
			if (sort === 'relevance') {
				let sq = search;
				if (minPaise != null) sq = sq.filter((x) => x.gte(x.field('salePrice'), minPaise));
				if (maxPaise != null) sq = sq.filter((x) => x.lte(x.field('salePrice'), maxPaise));
				if (inStockOnly) sq = sq.filter((x) => x.gt(x.field('stock'), 0));
				return await sq.paginate(paginationOpts);
			}

			// Explicit sort: a search index can't be .order()'d, so pull the top
			// matches, filter + sort in memory, and paginate by numeric offset. Capped
			// at SEARCH_CAP relevance hits (plenty for this catalog).
			const SEARCH_CAP = 200;
			const matches = (await search.take(SEARCH_CAP)).filter(
				(p) =>
					(minPaise == null || p.salePrice >= minPaise) &&
					(maxPaise == null || p.salePrice <= maxPaise) &&
					(!inStockOnly || p.stock > 0)
			);
			matches.sort((a, b) =>
				sort === 'price-asc'
					? a.salePrice - b.salePrice
					: sort === 'price-desc'
						? b.salePrice - a.salePrice
						: b._creationTime - a._creationTime
			);
			const offset = paginationOpts.cursor ? Number(paginationOpts.cursor) : 0;
			const end = offset + paginationOpts.numItems;
			const isDone = end >= matches.length;
			return {
				page: matches.slice(offset, end),
				isDone,
				continueCursor: isDone ? '' : String(end)
			};
		}

		// 2) Price sort or price range → walk a price-ordered index with bounds.
		if (priceSort || hasRange) {
			const base = category
				? ctx.db.query('products').withIndex('by_category_price', (idx) => {
						const c = idx.eq('category', category);
						if (minPaise != null && maxPaise != null)
							return c.gte('salePrice', minPaise).lte('salePrice', maxPaise);
						if (minPaise != null) return c.gte('salePrice', minPaise);
						if (maxPaise != null) return c.lte('salePrice', maxPaise);
						return c;
					})
				: ctx.db.query('products').withIndex('by_salePrice', (idx) => {
						if (minPaise != null && maxPaise != null)
							return idx.gte('salePrice', minPaise).lte('salePrice', maxPaise);
						if (minPaise != null) return idx.gte('salePrice', minPaise);
						if (maxPaise != null) return idx.lte('salePrice', maxPaise);
						return idx;
					});
			const ordered = base.order(sort === 'price-desc' ? 'desc' : 'asc');
			const q = inStockOnly ? ordered.filter((x) => x.gt(x.field('stock'), 0)) : ordered;
			return await q.paginate(paginationOpts);
		}

		// 3) Default (newest / relevance) → creation order, newest first.
		const base = category
			? ctx.db.query('products').withIndex('by_category', (idx) => idx.eq('category', category))
			: ctx.db.query('products');
		const ordered = base.order('desc');
		const q = inStockOnly ? ordered.filter((x) => x.gt(x.field('stock'), 0)) : ordered;
		return await q.paginate(paginationOpts);
	}
});

export const getProductsThatAre = query({
	args: {
		paginationOpts: paginationOptsValidator,
		category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary'))
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('products')
			.withIndex('by_category', (q) => q.eq('category', args.category))
			.paginate(args.paginationOpts);
	}
});

// NOTE: the old public, auth-less `deleteProduct` was removed — it let anyone
// delete any product by id. Admin deletion lives in dashboard.ts `removeProduct`
// (guarded by requireAdmin), which is what the dashboard already calls.

export const validateCartStock = mutation({
	args: {
		items: v.array(
			v.object({
				id: v.id('products'),
				name: v.string(),
				quantity: v.number()
			})
		)
	},
	handler: async (ctx, args) => {
		for (const item of args.items) {
			const product = await ctx.db.get(item.id);

			if (!product) {
				throw new Error(`The product "${item.name}" is no longer available.`);
			}

			if (product.stock < item.quantity) {
				throw new Error(
					`Insufficient stock for "${item.name}". You requested ${item.quantity}, but only ${product.stock} are left.`
				);
			}
		}
	}
});
