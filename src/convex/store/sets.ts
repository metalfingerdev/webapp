// School sets for customers: the classes a school has this session, and one set with its lines.
// Every function here is deliberately public (signed-out visitors browse sets). They return only
// customer fields: no stock numbers, nothing hidden, nothing from another session.
import { v } from 'convex/values';
import { query } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';
import type { QueryCtx } from '../_generated/server.js';
import { PLACEHOLDER_SESSION } from '../model/store/storeProfile.js';
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

const loadSchool = async (ctx: QueryCtx, slug: string) => {
	const school = await ctx.db
		.query('schools')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.unique();
	return school?.isActive ? school : null;
};

const currentSession = async (ctx: QueryCtx) =>
	(await ctx.db.query('storeSettings').first())?.currentSession ?? PLACEHOLDER_SESSION;

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
		const session = await currentSession(ctx);
		const sets = await ctx.db
			.query('schoolSets')
			.withIndex('by_schoolId_and_session_and_sortOrder', (q) =>
				q.eq('schoolId', school._id).eq('session', session)
			)
			.take(100);
		return {
			school: { name: school.name, slug: school.slug },
			session,
			sets: sets.filter((set) => set.isActive).map(summarise)
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
		const setId = ctx.db.normalizeId('schoolSets', args.setId);
		if (!school || !setId) return null;
		const set = await ctx.db.get('schoolSets', setId);
		const session = await currentSession(ctx);
		if (!set || !set.isActive || set.schoolId !== school._id || set.session !== session) {
			return null;
		}

		const categories = await loadActiveCategories(ctx);
		const items = await ctx.db
			.query('setItems')
			.withIndex('by_setId_and_sortOrder', (q) => q.eq('setId', set._id))
			.take(100);
		const lines: (typeof setLine.type)[] = [];
		for (const item of items) {
			const product = await ctx.db.get('products', item.productId);
			const category = product ? categories.get(product.categoryId) : undefined;
			if (!product || !product.isActive || !category) continue;
			const variants = (await loadActiveVariants(ctx, product._id)).filter(
				(variant) => !item.variantId || variant._id === item.variantId
			);
			if (variants.length === 0) continue;
			lines.push({
				id: item._id,
				title: product.title,
				slug: product.slug,
				categorySlug: category.slug,
				imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
				quantity: item.quantity,
				options: variants.map((variant) => ({
					variantId: variant._id,
					label: variant.label,
					price: variant.price,
					mrp: Math.max(variant.mrp, variant.price),
					availability: variantAvailability(variant)
				}))
			});
		}
		return {
			school: { name: school.name, slug: school.slug },
			session,
			set: summarise(set),
			lines
		};
	}
});
