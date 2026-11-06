import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { authComponent } from './auth.js';

// ─── Addresses ────────────────────────────────────────────────────────────────

export const listMyAddresses = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return [];
		return ctx.db
			.query('addresses')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.collect();
	}
});

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
		return ctx.db.insert('addresses', { ...args, userId: user._id });
	}
});

export const updateAddress = mutation({
	args: {
		id: v.id('addresses'),
		label: v.optional(v.string()),
		street: v.string(),
		city: v.string(),
		state: v.string(),
		pincode: v.string()
	},
	handler: async (ctx, { id, ...patch }) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');
		const addr = await ctx.db.get(id);
		if (!addr) throw new Error('Address not found.');
		if (addr.userId !== user._id) throw new Error('Unauthorized.');
		await ctx.db.patch(id, patch);
	}
});

export const removeAddress = mutation({
	args: { id: v.id('addresses') },
	handler: async (ctx, { id }) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');
		const addr = await ctx.db.get(id);
		if (!addr) throw new Error('Address not found.');
		if (addr.userId !== user._id) throw new Error('Unauthorized.');
		await ctx.db.delete(id);
	}
});

// ─── Order history ────────────────────────────────────────────────────────────

// Paginated so a user with many orders doesn't load everything at once.
export const listMyOrders = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, { paginationOpts }) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return { page: [], isDone: true, continueCursor: '' };

		const page = await ctx.db
			.query('orders')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.order('desc')
			.paginate(paginationOpts);

		const hydrated = await Promise.all(
			page.page.map(async (order) => {
				const purchases = await ctx.db
					.query('purchases')
					.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
					.collect();
				const items = await Promise.all(
					purchases.map(async (p) => ({
						...p,
						product: await ctx.db.get(p.productId)
					}))
				);
				// Latest tracking event for status line
				const latestTracking = await ctx.db
					.query('tracking')
					.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
					.order('desc')
					.first();
				return { ...order, items, latestTracking };
			})
		);

		return { ...page, page: hydrated };
	}
});

// Full detail for a single order — used when the user expands one.
export const getMyOrder = query({
	args: { id: v.id('orders') },
	handler: async (ctx, { id }) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');
		const order = await ctx.db.get(id);
		if (!order) throw new Error('Order not found.');
		if (order.userId !== user._id) throw new Error('Unauthorized.');

		const address = await ctx.db.get(order.address);
		const purchases = await ctx.db
			.query('purchases')
			.withIndex('by_orderId', (q) => q.eq('orderId', id))
			.collect();
		const items = await Promise.all(
			purchases.map(async (p) => ({
				...p,
				product: await ctx.db.get(p.productId)
			}))
		);
		const tracking = await ctx.db
			.query('tracking')
			.withIndex('by_orderId', (q) => q.eq('orderId', id))
			.order('desc')
			.collect();

		return { ...order, address, items, tracking };
	}
});
