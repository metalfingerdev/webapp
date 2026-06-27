// convex/cart.ts
import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';
import { authComponent } from './auth.js';

// SECURITY: every function here derives the owner from the authenticated
// session (authComponent.safeGetAuthUser), NOT from a client-supplied userId.
// A `userId` argument would be attacker-controlled — anyone could read or wipe
// another user's cart by passing a different id. This matches the project rule
// in _generated/ai/guidelines.md: never trust a userId arg for authorization.

// Get all cart items for the current user, populated with product information.
export const getCart = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return [];

		const items = await ctx.db
			.query('cartItems')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.collect();

		// Hydrate item with product details
		const populated = await Promise.all(
			items.map(async (item) => {
				const product = await ctx.db.get(item.productId);
				return product ? { ...item, product } : null;
			})
		);

		return populated.filter((item) => item !== null);
	}
});

// Sync guest/local items into the database cart upon login.
export const mergeGuestCart = mutation({
	args: {
		items: v.array(v.object({ productId: v.id('products'), quantity: v.number() }))
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');

		for (const guestItem of args.items) {
			const product = await ctx.db.get(guestItem.productId);
			if (!product) continue; // Skip if the product doesn't exist anymore

			const existing = await ctx.db
				.query('cartItems')
				.withIndex('by_userId_product', (q) =>
					q.eq('userId', user._id).eq('productId', guestItem.productId)
				)
				.unique();

			const maxStock = product.stock;

			if (existing) {
				const newQty = Math.min(existing.quantity + guestItem.quantity, maxStock);
				await ctx.db.patch(existing._id, { quantity: newQty });
			} else {
				const quantity = Math.min(guestItem.quantity, maxStock);
				if (quantity > 0) {
					await ctx.db.insert('cartItems', {
						userId: user._id,
						productId: guestItem.productId,
						quantity,
						addedAt: Date.now()
					});
				}
			}
		}
	}
});

// Handles both adding new items and updating quantities safely.
export const updateQuantity = mutation({
	args: {
		productId: v.id('products'),
		delta: v.number() // +1 or -1 (or any change offset)
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');

		const product = await ctx.db.get(args.productId);
		if (!product) return;

		const existing = await ctx.db
			.query('cartItems')
			.withIndex('by_userId_product', (q) =>
				q.eq('userId', user._id).eq('productId', args.productId)
			)
			.unique();

		// Handle item creation if it doesn't exist in the database cart yet
		if (!existing) {
			if (args.delta > 0) {
				const quantity = Math.min(args.delta, product.stock);
				if (quantity > 0) {
					await ctx.db.insert('cartItems', {
						userId: user._id,
						productId: args.productId,
						quantity,
						addedAt: Date.now()
					});
				}
			}
			return;
		}

		// Existing item update path
		const newQty = existing.quantity + args.delta;

		if (newQty <= 0) {
			await ctx.db.delete(existing._id);
		} else {
			// Clamp quantity to max stock dynamically to prevent stuck/invalid states
			const finalQty = Math.min(newQty, product.stock);
			await ctx.db.patch(existing._id, { quantity: finalQty });
		}
	}
});

// Clears all items belonging to the current user.
export const clearCart = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');

		const items = await ctx.db
			.query('cartItems')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.collect();
		for (const item of items) {
			await ctx.db.delete(item._id);
		}
	}
});
