// Admin: the stock-sheet import. `plan` is the preview, `apply` writes it; both run the same
// planner (model/store/importPlan.ts), and `apply` refuses if the plan moved since the preview.
import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { applyImport, importOptions, importRow, planImport } from '../../model/store/importPlan.js';

export const plan = query({
	args: { rows: v.array(importRow), options: importOptions },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		return await planImport(ctx, args.rows, args.options);
	}
});

export const apply = mutation({
	args: { rows: v.array(importRow), options: importOptions, fingerprint: v.string() },
	returns: v.object({ created: v.number(), updated: v.number() }),
	handler: async (ctx, args) => {
		const admin = await requireAppAdmin(ctx);
		return await applyImport(ctx, args.rows, args.options, args.fingerprint, admin._id);
	}
});
