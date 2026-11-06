// The store's access guards (.agents/skills/store-app/references/roles-and-access.md). Every store
// function calls exactly one of them, or says in a comment that it is deliberately public. None of
// them takes a user id: the caller is always derived from the session.
import { ConvexError } from 'convex/values';
import { authComponent } from '../../auth.js';
import type { MutationCtx, QueryCtx } from '../../_generated/server.js';

export { requireAppAdmin } from '../admin/index.js';

/** Any signed-in user. Returns the Better Auth user; its `_id` is the owner key on store rows. */
export const requireCustomer = async (ctx: QueryCtx | MutationCtx) => {
	const user = await authComponent.safeGetAuthUser(ctx);
	if (!user) throw new ConvexError('Not authenticated');
	return user;
};
