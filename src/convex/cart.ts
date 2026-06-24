// convex/cart.ts
import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';

// Get all cart items for a user, populated with product information
export const getCart = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const items = await ctx.db
			.query('cartItems')
			.withIndex('by_userId', (q) => q.eq('userId', args.userId))
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

// Sync guest/local items into database upon login
export const mergeGuestCart = mutation({
	args: {
		userId: v.string(),
		items: v.array(v.object({ productId: v.id('products'), quantity: v.number() }))
	},
	handler: async (ctx, args) => {
		for (const guestItem of args.items) {
			const product = await ctx.db.get(guestItem.productId);
			if (!product) continue; // Skip if the product doesn't exist anymore

			const existing = await ctx.db
				.query('cartItems')
				.withIndex('by_userId_product', (q) =>
					q.eq('userId', args.userId).eq('productId', guestItem.productId)
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
						userId: args.userId,
						productId: guestItem.productId,
						quantity,
						addedAt: Date.now()
					});
				}
			}
		}
	}
});

// Handles both adding new items and updating quantities safely
export const updateQuantity = mutation({
	args: {
		userId: v.string(),
		productId: v.id('products'),
		delta: v.number() // +1 or -1 (or any change offset)
	},
	handler: async (ctx, args) => {
		const product = await ctx.db.get(args.productId);
		if (!product) return;

		const existing = await ctx.db
			.query('cartItems')
			.withIndex('by_userId_product', (q) =>
				q.eq('userId', args.userId).eq('productId', args.productId)
			)
			.unique();

		// FIX: Handle item creation if it doesn't exist in the database cart yet
		if (!existing) {
			if (args.delta > 0) {
				const quantity = Math.min(args.delta, product.stock);
				if (quantity > 0) {
					await ctx.db.insert('cartItems', {
						userId: args.userId,
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

// Clears all items belonging to a specific user
export const clearCart = mutation({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const items = await ctx.db
			.query('cartItems')
			.withIndex('by_userId', (q) => q.eq('userId', args.userId))
			.collect();
		for (const item of items) {
			await ctx.db.delete(item._id);
		}
	}
});
