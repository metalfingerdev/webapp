import { v } from 'convex/values';
import { query } from '../_generated/server.js';
import { authComponent } from '../auth.js';
import { AUTH_CONSTANTS } from '../auth.constants.js';
import { isAppAdminUser } from '../model/admin/index.js';

/**
 * Deliberately public: who the caller is, for the header and user menu. UX only; each function's
 * own guard is the security boundary.
 */
export const myRoles = query({
	args: {},
	returns: v.object({ isSignedIn: v.boolean(), isAdmin: v.boolean() }),
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		return {
			isSignedIn: Boolean(user),
			isAdmin: Boolean(
				user && AUTH_CONSTANTS.admin && isAppAdminUser({ id: user._id, role: user.role })
			)
		};
	}
});
