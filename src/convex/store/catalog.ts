// The public catalogue. Every function here is deliberately public: signed-out visitors browse it.
// They return only the shapes in model/store/publicProjection.ts.
import { v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { query } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';
import {
	loadActiveCategories,
	productCard,
	productDetail,
	toProductCard,
	toProductDetail,
	type ProductCard
} from '../model/store/publicProjection.js';
import { loadActiveSchool, loadSetProductIds } from '../model/store/schools.js';

const categoryNode = v.object({
	name: v.string(),
	slug: v.string(),
	children: v.array(v.object({ name: v.string(), slug: v.string() }))
});

/** Deliberately public: the category tree for the menu and filters. */
export const listCategories = query({
	args: {},
	returns: v.array(categoryNode),
	handler: async (ctx) => {
		const active = [...(await loadActiveCategories(ctx)).values()].sort(
			(a, b) => a.sortOrder - b.sortOrder
		);
		return active
			.filter((category) => !category.parentId)
			.map((parent) => ({
				name: parent.name,
				slug: parent.slug,
				children: active
					.filter((child) => child.parentId === parent._id)
					.map((child) => ({ name: child.name, slug: child.slug }))
			}));
	}
});

/** Deliberately public: the schools, for the menu and the home page. */
export const listSchools = query({
	args: {},
	returns: v.array(v.object({ name: v.string(), slug: v.string() })),
	handler: async (ctx) => {
		const schools = await ctx.db.query('schools').withIndex('by_sortOrder').take(50);
		return schools
			.filter((school) => school.isActive)
			.map((school) => ({ name: school.name, slug: school.slug }));
	}
});

/**
 * Deliberately public: one page of products, newest first. `categorySlug` may name a parent
 * category, which includes its children. `schoolSlug` keeps the products on that school's current
 * sets and its uniform pieces. The school, class, price and stock filters apply to the page that
 * was read, so a page can come back short; the screen keeps offering "Show more" until `isDone`.
 * (Filtering the whole catalogue first needs price and stock on the product, which the data model
 * keeps on variants; revisit when the real catalogue is imported.)
 */
export const listProducts = query({
	args: {
		categorySlug: v.optional(v.string()),
		schoolSlug: v.optional(v.string()),
		classLevel: v.optional(v.number()),
		minPrice: v.optional(v.number()),
		maxPrice: v.optional(v.number()),
		inStockOnly: v.optional(v.boolean()),
		paginationOpts: paginationOptsValidator
	},
	returns: paginationResultValidator(productCard),
	handler: async (ctx, args) => {
		const active = await loadActiveCategories(ctx);
		const empty = { page: [], isDone: true, continueCursor: '' };

		let leaf: Doc<'categories'> | undefined;
		let allowed: Set<string> | undefined;
		if (args.categorySlug) {
			const category = await ctx.db
				.query('categories')
				.withIndex('by_slug', (q) => q.eq('slug', args.categorySlug!))
				.unique();
			if (!category || !active.has(category._id)) return empty;
			const children = [...active.values()].filter((c) => c.parentId === category._id);
			if (children.length === 0) leaf = category;
			else allowed = new Set([category._id, ...children.map((c) => c._id)]);
		}

		let school: { id: Doc<'schools'>['_id']; products: Set<string> } | undefined;
		if (args.schoolSlug) {
			const found = await loadActiveSchool(ctx, args.schoolSlug);
			if (!found) return empty;
			school = { id: found._id, products: await loadSetProductIds(ctx, found._id) };
		}

		const result = leaf
			? await ctx.db
					.query('products')
					.withIndex('by_categoryId_and_isActive', (q) =>
						q.eq('categoryId', leaf!._id).eq('isActive', true)
					)
					.order('desc')
					.paginate(args.paginationOpts)
			: await ctx.db
					.query('products')
					.withIndex('by_isActive', (q) => q.eq('isActive', true))
					.order('desc')
					.paginate(args.paginationOpts);

		const page: ProductCard[] = [];
		for (const product of result.page) {
			if (allowed && !allowed.has(product.categoryId)) continue;
			if (school && product.schoolId !== school.id && !school.products.has(product._id)) continue;
			const card = await toProductCard(ctx, product, active);
			if (!card) continue;
			if (args.classLevel !== undefined) {
				const { classFrom, classTo } = card;
				if (classFrom === undefined || classTo === undefined) continue;
				if (args.classLevel < classFrom || args.classLevel > classTo) continue;
			}
			if (args.minPrice !== undefined && card.price < args.minPrice) continue;
			if (args.maxPrice !== undefined && card.price > args.maxPrice) continue;
			if (args.inStockOnly && card.availability === 'out') continue;
			page.push(card);
		}
		return { ...result, page };
	}
});

/** Deliberately public: one product by its URL, or null when it is hidden or missing. */
export const getProduct = query({
	args: { categorySlug: v.string(), slug: v.string() },
	returns: v.union(productDetail, v.null()),
	handler: async (ctx, args) => {
		const product = await ctx.db
			.query('products')
			.withIndex('by_slug', (q) => q.eq('slug', args.slug))
			.unique();
		if (!product) return null;
		const detail = await toProductDetail(ctx, product, await loadActiveCategories(ctx));
		return detail && detail.categorySlug === args.categorySlug ? detail : null;
	}
});

/** Deliberately public: search by title, author, publisher, ISBN or subject. Bounded by `limit`. */
export const search = query({
	args: { text: v.string(), limit: v.optional(v.number()) },
	returns: v.array(productCard),
	handler: async (ctx, args) => {
		const text = args.text.trim().slice(0, 100);
		if (text.length < 2) return [];
		const limit = Math.min(Math.max(args.limit ?? 8, 1), 48);
		const active = await loadActiveCategories(ctx);
		const hits = await ctx.db
			.query('products')
			.withSearchIndex('search_text', (q) => q.search('searchText', text).eq('isActive', true))
			.take(limit);
		const cards: ProductCard[] = [];
		for (const product of hits) {
			const card = await toProductCard(ctx, product, active);
			if (card) cards.push(card);
		}
		return cards;
	}
});

/** Deliberately public: the contact details the owner typed in, for the footer and home page. */
export const getContact = query({
	args: {},
	returns: v.object({
		businessName: v.string(),
		phone: v.optional(v.string()),
		whatsapp: v.optional(v.string()),
		email: v.optional(v.string()),
		address: v.optional(v.string()),
		gstin: v.optional(v.string())
	}),
	handler: async (ctx) => {
		const settings = await ctx.db.query('storeSettings').first();
		return {
			businessName: settings?.businessName ?? 'Aggarwal Kart',
			phone: settings?.phone,
			whatsapp: settings?.whatsapp,
			email: settings?.email,
			address: settings?.address,
			gstin: settings?.gstin
		};
	}
});
