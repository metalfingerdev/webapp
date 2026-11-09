// Admin: the Product On Demand inbox. Every function calls requireAppAdmin first.
import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { MAX_ENQUIRY_NOTE } from '../../model/store/enquiries.js';
import { enquiryStatus } from '../validators.js';

const NEW_COUNT_CAP = 100;

/** Newest first, one status at a time */
export const list = query({
	args: { status: enquiryStatus, paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		return await ctx.db
			.query('enquiries')
			.withIndex('by_status_and_createdAt', (q) => q.eq('status', args.status))
			.order('desc')
			.paginate(args.paginationOpts);
	}
});

export const get = query({
	args: { id: v.id('enquiries') },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		return await ctx.db.get(args.id);
	}
});

/** For the badge on the rail: new enquiries, counted up to 100 */
export const countNew = query({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const rows = await ctx.db
			.query('enquiries')
			.withIndex('by_status_and_createdAt', (q) => q.eq('status', 'new'))
			.take(NEW_COUNT_CAP);
		return rows.length;
	}
});

export const update = mutation({
	args: { id: v.id('enquiries'), status: enquiryStatus, note: v.optional(v.string()) },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const note = args.note?.trim() || undefined;
		if (note && note.length > MAX_ENQUIRY_NOTE) {
			throw new ConvexError(`A note is at most ${MAX_ENQUIRY_NOTE} characters`);
		}
		const row = await ctx.db.get(args.id);
		if (!row) throw new ConvexError('Enquiry not found');
		await ctx.db.patch(args.id, { status: args.status, note });
		return null;
	}
});
