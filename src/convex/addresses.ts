// convex/addresses.ts
import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';
import { authComponent } from './auth.js';

/**
 * Returns all saved addresses for the currently authenticated user.
 * Returns [] for unauthenticated callers rather than throwing, so the
 * cart address step can render "no addresses yet" gracefully.
 */
export const getMyAddresses = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return [];
		return ctx.db
			.query('addresses')
			.withIndex('by_userId', (q) => q.eq('userId', user._id)) // Changed from user.id
			.collect();
	}
});

/**
 * Saves a new address for the current user and returns its Id.
 * The cart uses the returned Id immediately as the selectedAddressId
 * so the user can place their order without an extra click.
 */
export const addAddress = mutation({
	args: {
		label: v.optional(v.string()),
		street: v.string(),
		city: v.string(),
		state: v.string(),
		pincode: v.string()
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');
		return ctx.db.insert('addresses', { ...args, userId: user._id }); // Changed from user.id
	}
});

export const deleteAddress = mutation({
	args: { id: v.id('addresses') },
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');
		const address = await ctx.db.get(args.id);
		// Guard: users can only delete their own addresses
		if (!address || address.userId !== user._id) throw new Error('Not found'); // Changed from user.id
		await ctx.db.delete(args.id);
	}
});
