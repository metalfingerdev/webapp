// Admin: the schools the shop sells sets for. Every function calls requireAppAdmin first.
// Schools are hidden, never deleted: sets and past orders point at them.
import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { slugify } from '../../model/store/catalog.js';
import { currentSession } from '../../model/store/schools.js';
import { loadSchoolSets } from '../../model/store/setRules.js';

const MAX_SCHOOLS = 100;

const checkName = (name: string) => {
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 80) throw new ConvexError('A school name is 1 to 80 characters');
	return trimmed;
};

/** Every school in site order, hidden too, with its set count for the current session. */
export const list = query({
	args: {},
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const session = await currentSession(ctx);
		const schools = await ctx.db.query('schools').withIndex('by_sortOrder').take(MAX_SCHOOLS);
		const rows = [];
		for (const school of schools) {
			const sets = await loadSchoolSets(ctx, school._id, session);
			rows.push({
				_id: school._id,
				name: school.name,
				slug: school.slug,
				isActive: school.isActive,
				sets: sets.length,
				liveSets: sets.filter((set) => set.isActive).length
			});
		}
		return { session, schools: rows };
	}
});

export const get = query({
	args: { schoolId: v.id('schools') },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		return await ctx.db.get('schools', args.schoolId);
	}
});

/** Adds a school, hidden until it has sets. Its slug (the URL) is set now and never changes. */
export const create = mutation({
	args: { name: v.string() },
	returns: v.id('schools'),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const name = checkName(args.name);
		const base = slugify(name);
		let slug = base;
		for (let n = 2; ; n += 1) {
			const taken = await ctx.db
				.query('schools')
				.withIndex('by_slug', (q) => q.eq('slug', slug))
				.first();
			if (!taken) break;
			if (n > 100) throw new ConvexError('Too many schools share this name');
			slug = `${base}-${n}`;
		}
		const last = await ctx.db.query('schools').withIndex('by_sortOrder').order('desc').first();
		return await ctx.db.insert('schools', {
			name,
			slug,
			isActive: false,
			sortOrder: (last?.sortOrder ?? 0) + 1
		});
	}
});

export const update = mutation({
	args: { schoolId: v.id('schools'), name: v.string(), isActive: v.boolean() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		if (!(await ctx.db.get('schools', args.schoolId))) throw new ConvexError('School not found');
		await ctx.db.patch('schools', args.schoolId, {
			name: checkName(args.name),
			isActive: args.isActive
		});
		return null;
	}
});

/** Swaps a school with its neighbour in the site order. */
export const move = mutation({
	args: { schoolId: v.id('schools'), direction: v.union(v.literal('up'), v.literal('down')) },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const school = await ctx.db.get('schools', args.schoolId);
		if (!school) throw new ConvexError('School not found');
		const neighbour =
			args.direction === 'up'
				? await ctx.db
						.query('schools')
						.withIndex('by_sortOrder', (q) => q.lt('sortOrder', school.sortOrder))
						.order('desc')
						.first()
				: await ctx.db
						.query('schools')
						.withIndex('by_sortOrder', (q) => q.gt('sortOrder', school.sortOrder))
						.first();
		if (!neighbour) return null;
		await ctx.db.patch('schools', school._id, { sortOrder: neighbour.sortOrder });
		await ctx.db.patch('schools', neighbour._id, { sortOrder: school.sortOrder });
		return null;
	}
});
