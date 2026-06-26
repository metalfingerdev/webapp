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

export const getSchoolProducts = query({
	args: {
		paginationOpts: paginationOptsValidator,
		schoolId: v.id('schools'),
		grade: v.string(),
		category: v.optional(v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')))
	},
	handler: async (ctx, args) => {
		const bundlePage = await ctx.db
			.query('bundles')
			.withIndex('by_school_grade', (q) => q.eq('schoolId', args.schoolId).eq('grade', args.grade))
			.paginate(args.paginationOpts);

		const products = await Promise.all(bundlePage.page.map((b) => ctx.db.get(b.productId)));

		return {
			...bundlePage,
			page: products
				.filter((p): p is NonNullable<typeof p> => p !== null)
				.filter((p) => !args.category || p.category === args.category)
		};
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

export const deleteProduct = mutation({
	args: { id: v.id('products') },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	}
});

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
