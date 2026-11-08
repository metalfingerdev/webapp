// Schools and their sets, shared by the set pages, the extras and the catalogue's school filter.
import type { Doc, Id } from '../../_generated/dataModel.js';
import type { QueryCtx } from '../../_generated/server.js';
import { PLACEHOLDER_SESSION } from './storeProfile.js';

/** The school with this slug, or null when it is missing or hidden. */
export const loadActiveSchool = async (ctx: QueryCtx, slug: string) => {
	const school = await ctx.db
		.query('schools')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.unique();
	return school?.isActive ? school : null;
};

/** The academic session customers see, from the settings row. */
export const currentSession = async (ctx: QueryCtx) =>
	(await ctx.db.query('storeSettings').first())?.currentSession ?? PLACEHOLDER_SESSION;

/** The school's active sets for the current session. */
export const loadCurrentSets = async (
	ctx: QueryCtx,
	schoolId: Id<'schools'>
): Promise<Doc<'schoolSets'>[]> => {
	const session = await currentSession(ctx);
	const sets = await ctx.db
		.query('schoolSets')
		.withIndex('by_schoolId_and_session_and_sortOrder', (q) =>
			q.eq('schoolId', schoolId).eq('session', session)
		)
		.take(100);
	return sets.filter((set) => set.isActive);
};

/**
 * Every product a school's current sets list. A product "belongs" to a school when it is on one of
 * these lists or carries the school's id (uniform pieces).
 */
export const loadSetProductIds = async (ctx: QueryCtx, schoolId: Id<'schools'>) => {
	const ids = new Set<Id<'products'>>();
	for (const set of await loadCurrentSets(ctx, schoolId)) {
		const items = await ctx.db
			.query('setItems')
			.withIndex('by_setId_and_sortOrder', (q) => q.eq('setId', set._id))
			.take(100);
		for (const item of items) ids.add(item.productId);
	}
	return ids;
};
