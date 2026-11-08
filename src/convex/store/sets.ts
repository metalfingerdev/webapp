// School sets for customers: the classes a school has this session, and one set with its lines.
// Every function here is deliberately public (signed-out visitors browse sets). They return only
// customer fields: no stock numbers, nothing hidden, nothing from another session.
import { v } from 'convex/values';
import { query } from '../_generated/server.js';
import type { Doc, Id } from '../_generated/dataModel.js';
import type { QueryCtx } from '../_generated/server.js';
import { currentSession, loadActiveSchool, loadCurrentSets } from '../model/store/schools.js';
import {
	availability,
	loadActiveCategories,
	loadActiveVariants,
	variantAvailability
} from '../model/store/publicProjection.js';
import { gender, setType, uniformType } from './validators.js';

const schoolRef = v.object({ name: v.string(), slug: v.string() });

const setSummary = v.object({
	id: v.id('schoolSets'),
	type: setType,
	label: v.string(),
	classFrom: v.number(),
	classTo: v.number(),
	gender: v.optional(gender),
	uniformType: v.optional(uniformType)
});

const setLine = v.object({
	id: v.id('setItems'),
	title: v.string(),
	slug: v.string(),
	categorySlug: v.string(),
	imageUrl: v.union(v.string(), v.null()),
	quantity: v.number(),
	/** A book names its one size; a uniform piece lists every size the school sells */
	options: v.array(
		v.object({
			variantId: v.id('productVariants'),
			label: v.string(),
			price: v.number(),
			mrp: v.number(),
			availability
		})
	)
});

const loadSchool = loadActiveSchool;

/**
 * Where "Add more to this set" draws from, besides the school's own products: this category and its
 * sections. Placeholder until the real category list is in.
 */
export const EXTRAS_CATEGORY_SLUG = 'stationery';
const MAX_EXTRAS = 40;

type Option = (typeof setLine.type)['options'][number];

/** A product's visible sizes as set-page options, or null when the product or its category is hidden. */
const toOptions = async (
	ctx: QueryCtx,
	product: Doc<'products'> | null,
	categories: Map<Id<'categories'>, Doc<'categories'>>,
	onlyVariant?: Id<'productVariants'>
) => {
	const category = product ? categories.get(product.categoryId) : undefined;
	if (!product || !product.isActive || !category) return null;
	const variants = (await loadActiveVariants(ctx, product._id)).filter(
		(variant) => !onlyVariant || variant._id === onlyVariant
	);
	if (variants.length === 0) return null;
	const options: Option[] = variants.map((variant) => ({
		variantId: variant._id,
		label: variant.label,
		price: variant.price,
		mrp: Math.max(variant.mrp, variant.price),
		availability: variantAvailability(variant)
	}));
	return {
		title: product.title,
		slug: product.slug,
		categorySlug: category.slug,
		imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
		options
	};
};

/** A set this school sells this session, or null */
const loadCurrentSet = async (ctx: QueryCtx, school: Doc<'schools'>, rawSetId: string) => {
	const setId = ctx.db.normalizeId('schoolSets', rawSetId);
	const set = setId ? await ctx.db.get('schoolSets', setId) : null;
	const session = await currentSession(ctx);
	if (!set || !set.isActive || set.schoolId !== school._id || set.session !== session) return null;
	return { set, session };
};

const loadItems = (ctx: QueryCtx, setId: Id<'schoolSets'>) =>
	ctx.db
		.query('setItems')
		.withIndex('by_setId_and_sortOrder', (q) => q.eq('setId', setId))
		.take(100);

const summarise = (set: Doc<'schoolSets'>) => ({
	id: set._id,
	type: set.type,
	label: set.label,
	classFrom: set.classFrom,
	classTo: set.classTo,
	gender: set.gender,
	uniformType: set.uniformType
});

/** Deliberately public: a school's sets for the current session, or null for a hidden or missing school. */
export const listForSchool = query({
	args: { schoolSlug: v.string() },
	returns: v.union(
		v.object({ school: schoolRef, session: v.string(), sets: v.array(setSummary) }),
		v.null()
	),
	handler: async (ctx, args) => {
		const school = await loadSchool(ctx, args.schoolSlug);
		if (!school) return null;
		return {
			school: { name: school.name, slug: school.slug },
			session: await currentSession(ctx),
			sets: (await loadCurrentSets(ctx, school._id)).map(summarise)
		};
	}
});

/**
 * Deliberately public: one set with its lines. Null when the school, the set or its session is not
 * current and visible. A line whose product, category or size is hidden is left out.
 */
export const getSet = query({
	args: { schoolSlug: v.string(), setId: v.string() },
	returns: v.union(
		v.object({
			school: schoolRef,
			session: v.string(),
			set: setSummary,
			lines: v.array(setLine)
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const school = await loadSchool(ctx, args.schoolSlug);
		const found = school ? await loadCurrentSet(ctx, school, args.setId) : null;
		if (!school || !found) return null;
		const { set, session } = found;

		const categories = await loadActiveCategories(ctx);
		const lines: (typeof setLine.type)[] = [];
		for (const item of await loadItems(ctx, set._id)) {
			const product = await ctx.db.get('products', item.productId);
			const shown = await toOptions(ctx, product, categories, item.variantId);
			if (shown) lines.push({ id: item._id, quantity: item.quantity, ...shown });
		}
		return {
			school: { name: school.name, slug: school.slug },
			session,
			set: summarise(set),
			lines
		};
	}
});

const extraLine = v.object({ ...setLine.fields, id: v.id('products') });

/**
 * Deliberately public: what a parent can add to a set besides its own lines (dictated 2026-11-08,
 * "add items to the set"): the school's other products (uniform pieces, accessories) and the
 * stationery. Each comes as one copy, unticked on the page. Hidden things never appear; empty for a
 * set that is not on sale.
 */
export const listExtras = query({
	args: { schoolSlug: v.string(), setId: v.string() },
	returns: v.array(extraLine),
	handler: async (ctx, args) => {
		const school = await loadSchool(ctx, args.schoolSlug);
		const found = school ? await loadCurrentSet(ctx, school, args.setId) : null;
		if (!school || !found) return [];

		const categories = await loadActiveCategories(ctx);
		const inSet = new Set((await loadItems(ctx, found.set._id)).map((item) => item.productId));
		const candidates: Doc<'products'>[] = await ctx.db
			.query('products')
			.withIndex('by_schoolId_and_kind', (q) => q.eq('schoolId', school._id))
			.take(MAX_EXTRAS * 2);

		const root = [...categories.values()].find((c) => c.slug === EXTRAS_CATEGORY_SLUG);
		if (root) {
			const tree = [root, ...[...categories.values()].filter((c) => c.parentId === root._id)];
			for (const category of tree) {
				candidates.push(
					...(await ctx.db
						.query('products')
						.withIndex('by_categoryId_and_isActive', (q) =>
							q.eq('categoryId', category._id).eq('isActive', true)
						)
						.take(MAX_EXTRAS))
				);
			}
		}

		const extras: (typeof extraLine.type)[] = [];
		const seen = new Set<Id<'products'>>();
		for (const product of candidates) {
			if (extras.length >= MAX_EXTRAS) break;
			if (inSet.has(product._id) || seen.has(product._id)) continue;
			seen.add(product._id);
			const shown = await toOptions(ctx, product, categories);
			if (shown) extras.push({ id: product._id, quantity: 1, ...shown });
		}
		return extras;
	}
});
