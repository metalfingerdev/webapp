import { v } from 'convex/values';
import { query } from './_generated/server.js';
import { authComponent } from './auth.js';
import { AUTH_CONSTANTS } from './auth.constants.js';
import { getIsAppAdmin } from './model/admin/index.js';

/**
 * Which store areas the signed-in user may open, for the navbar and user menu ("Dashboard").
 * UX only: every dashboard function checks `requireAppAdmin` itself.
 */
export const myRoles = query({
	args: {},
	returns: v.object({ isSignedIn: v.boolean(), isAdmin: v.boolean() }),
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		const isAdmin = AUTH_CONSTANTS.admin === true && (await getIsAppAdmin(ctx));
		return { isSignedIn: user !== null, isAdmin };
	}
});
