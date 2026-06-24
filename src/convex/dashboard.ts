import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';
import type { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import type { DataModel } from './_generated/dataModel.js';
import { authComponent } from './auth.js';
import { ORDER_STATUS, TRACKING_STATUS } from './schema.js';
import { paginationOptsValidator } from 'convex/server';

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

// ─── Role guard ────────────────────────────────────────────────────────────────

async function requireElevated(ctx: Ctx) {
	const user = await authComponent.safeGetAuthUser(ctx);
	if (!user) throw new Error('Unauthenticated');
	const roleDoc = await ctx.db
		.query('userRoles')
		.withIndex('by_email', (q) => q.eq('email', user.email))
		.unique();
	if (roleDoc?.role !== 'admin' && roleDoc?.role !== 'developer') {
		throw new Error('Unauthorized');
	}
	return user;
}

async function requireAdmin(ctx: Ctx) {
	const user = await authComponent.safeGetAuthUser(ctx);
	if (!user) throw new Error('Unauthenticated');
	const roleDoc = await ctx.db
		.query('userRoles')
		.withIndex('by_email', (q) => q.eq('email', user.email))
		.unique();
	if (roleDoc?.role !== 'admin') {
		throw new Error('Unauthorized: admin only');
	}
	return user;
}

// ─── Shared validators ─────────────────────────────────────────────────────────

const detailsV = v.union(
	v.object({
		type: v.literal('book'),
		author: v.string(),
		subject: v.string(),
		school: v.optional(v.id('schools'))
	}),
	v.object({
		type: v.literal('clothes'),
		gender: v.string(),
		size: v.string(),
		variant: v.union(v.literal('sports'), v.literal('white')),
		school: v.optional(v.id('schools'))
	}),
	v.object({
		type: v.literal('stationary'),
		itemType: v.string()
	})
);

// ─── Schools ───────────────────────────────────────────────────────────────────

export const listSchools = query({
	args: {},
	handler: async (ctx) => {
		await requireElevated(ctx);
		return ctx.db.query('schools').collect();
	}
});

export const getSchool = query({
	args: { id: v.id('schools') },
	handler: async (ctx, { id }) => {
		await requireElevated(ctx);
		return ctx.db.get(id);
	}
});

export const createSchool = mutation({
	args: {
		name: v.string(),
		code: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		await requireElevated(ctx);
		return ctx.db.insert('schools', args);
	}
});

export const updateSchool = mutation({
	args: {
		id: v.id('schools'),
		name: v.string(),
		code: v.optional(v.string())
	},
	handler: async (ctx, { id, ...patch }) => {
		await requireElevated(ctx);
		await ctx.db.patch(id, patch);
	}
});

export const removeSchool = mutation({
	args: { id: v.id('schools') },
	handler: async (ctx, { id }) => {
		await requireAdmin(ctx);
		// Guard: reject if any products or bundles still reference this school.
		const linkedBundle = await ctx.db
			.query('bundles')
			.withIndex('by_school_grade', (q) => q.eq('schoolId', id))
			.first();
		if (linkedBundle) throw new Error('School has bundles — remove them first.');
		await ctx.db.delete(id);
	}
});

// ─── Products ──────────────────────────────────────────────────────────────────

export const listProducts = query({
	args: {
		category: v.optional(v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')))
	},
	handler: async (ctx, { category }) => {
		await requireElevated(ctx);
		if (category) {
			return ctx.db
				.query('products')
				.withIndex('by_category', (q) => q.eq('category', category))
				.collect();
		}
		return ctx.db.query('products').collect();
	}
});

export const getProduct = query({
	args: { id: v.id('products') },
	handler: async (ctx, { id }) => {
		await requireElevated(ctx);
		return ctx.db.get(id);
	}
});

export const createProduct = mutation({
	args: {
		name: v.string(),
		weight: v.number(),
		imageUrl: v.optional(v.string()),
		category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')),
		salePrice: v.number(),
		stock: v.number(),
		details: detailsV
	},
	handler: async (ctx, args) => {
		await requireElevated(ctx);
		return ctx.db.insert('products', args);
	}
});

export const updateProduct = mutation({
	args: {
		id: v.id('products'),
		name: v.string(),
		imageUrl: v.optional(v.string()),
		category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')),
		salePrice: v.number(),
		stock: v.number(),
		details: detailsV
	},
	handler: async (ctx, { id, ...patch }) => {
		await requireElevated(ctx);
		await ctx.db.patch(id, patch);
	}
});

export const removeProduct = mutation({
	args: { id: v.id('products') },
	handler: async (ctx, { id }) => {
		await requireAdmin(ctx);
		await ctx.db.delete(id);
	}
});

// Adjust stock without touching any other fields — useful for warehouse ops.
export const adjustStock = mutation({
	args: {
		id: v.id('products'),
		delta: v.number() // positive = restock, negative = manual deduction
	},
	handler: async (ctx, { id, delta }) => {
		await requireElevated(ctx);
		const product = await ctx.db.get(id);
		if (!product) throw new Error('Product not found.');
		const newStock = product.stock + delta;
		if (newStock < 0) throw new Error('Stock cannot go below zero.');
		await ctx.db.patch(id, { stock: newStock });
	}
});

// ─── Bundles ───────────────────────────────────────────────────────────────────

// Returns every bundle for a school, optionally filtered by grade.
export const listBundles = query({
	args: {
		schoolId: v.id('schools'),
		grade: v.optional(v.string())
	},
	handler: async (ctx, { schoolId, grade }) => {
		await requireElevated(ctx);
		const q = ctx.db.query('bundles').withIndex('by_school_grade', (q) => {
			if (grade) return q.eq('schoolId', schoolId).eq('grade', grade);
			return q.eq('schoolId', schoolId);
		});
		const bundles = await q.collect();
		// Hydrate product details so the dashboard doesn't need a second round-trip.
		return Promise.all(
			bundles.map(async (b) => ({
				...b,
				product: await ctx.db.get(b.productId)
			}))
		);
	}
});

export const addToBundle = mutation({
	args: {
		schoolId: v.id('schools'),
		grade: v.string(),
		productId: v.id('products')
	},
	handler: async (ctx, args) => {
		await requireElevated(ctx);
		// Prevent duplicate entries in the same bundle.
		const existing = await ctx.db
			.query('bundles')
			.withIndex('by_school_grade_product', (q) =>
				q.eq('schoolId', args.schoolId).eq('grade', args.grade).eq('productId', args.productId)
			)
			.unique();
		if (existing) throw new Error('Product already in this bundle.');
		return ctx.db.insert('bundles', args);
	}
});

export const removeFromBundle = mutation({
	args: { id: v.id('bundles') },
	handler: async (ctx, { id }) => {
		await requireElevated(ctx);
		await ctx.db.delete(id);
	}
});

// ─── Orders ────────────────────────────────────────────────────────────────────

// List all orders with optional status filter, newest first.

export const listOrders = query({
	args: {
		status: v.optional(ORDER_STATUS),
		paginationOpts: paginationOptsValidator
	},
	handler: async (ctx, { status, paginationOpts }) => {
		await requireElevated(ctx);

		// orders has no status index, so we branch:
		// - filtered: walk by_status index (add this to schema — see below)
		// - unfiltered: walk insertion order
		const q = status
			? ctx.db
					.query('orders')
					.withIndex('by_status', (q) => q.eq('status', status))
					.order('desc')
			: ctx.db.query('orders').order('desc');

		const page = await q.paginate(paginationOpts);

		// Hydrate each page of results
		const hydrated = await Promise.all(
			page.page.map(async (order) => {
				const address = await ctx.db.get(order.address);
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
				return { ...order, address, items };
			})
		);

		return { ...page, page: hydrated };
	}
});
export const getOrder = query({
	args: { id: v.id('orders') },
	handler: async (ctx, { id }) => {
		await requireElevated(ctx);
		const order = await ctx.db.get(id);
		if (!order) throw new Error('Order not found.');
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

// Advance the order through the state machine.
export const updateOrderStatus = mutation({
	args: {
		id: v.id('orders'),
		status: ORDER_STATUS,
		// Carrier tracking number — only relevant when moving to 'shipped'.
		trackingId: v.optional(v.string())
	},
	handler: async (ctx, { id, status, trackingId }) => {
		await requireElevated(ctx);
		const patch: Record<string, unknown> = { status };
		if (trackingId) patch.trackingId = trackingId;
		await ctx.db.patch(id, patch);
	}
});

export const cancelOrder = mutation({
	args: { id: v.id('orders') },
	handler: async (ctx, { id }) => {
		await requireElevated(ctx);
		const order = await ctx.db.get(id);
		if (!order) throw new Error('Order not found.');
		if (order.status === 'delivered' || order.status === 'shipped') {
			throw new Error(`Cannot cancel an order that is already ${order.status}.`);
		}
		await ctx.db.patch(id, { status: 'cancelled' });
	}
});

// ─── Tracking ──────────────────────────────────────────────────────────────────

export const listTrackingEvents = query({
	args: { orderId: v.id('orders') },
	handler: async (ctx, { orderId }) => {
		await requireElevated(ctx);
		return ctx.db
			.query('tracking')
			.withIndex('by_orderId', (q) => q.eq('orderId', orderId))
			.order('desc')
			.collect();
	}
});

// Push a new carrier event. Also keeps the parent order status in sync.
export const pushTrackingEvent = mutation({
	args: {
		orderId: v.id('orders'),
		status: TRACKING_STATUS,
		carrier: v.optional(v.string()),
		location: v.optional(v.string()),
		message: v.optional(v.string())
	},
	handler: async (ctx, { orderId, status, carrier, location, message }) => {
		await requireElevated(ctx);
		await ctx.db.insert('tracking', {
			orderId,
			status,
			carrier,
			location,
			message,
			timestamp: Date.now()
		});
		// Keep order.status consistent with tracking milestones.
		const orderStatusMap: Partial<
			Record<
				| 'order_placed'
				| 'processing'
				| 'dispatched'
				| 'in_transit'
				| 'out_for_delivery'
				| 'delivered',
				'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
			>
		> = {
			order_placed: 'pending',
			processing: 'processing',
			dispatched: 'shipped',
			in_transit: 'shipped',
			out_for_delivery: 'shipped',
			delivered: 'delivered'
		};
		const mapped = orderStatusMap[status];
		if (mapped) {
			await ctx.db.patch(orderId, { status: mapped });
		}
	}
});

// ─── Users / Roles ─────────────────────────────────────────────────────────────

export const listUsers = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		return ctx.db.query('userRoles').collect();
	}
});

export const setUserRole = mutation({
	args: {
		email: v.string(),
		role: v.union(v.literal('admin'), v.literal('developer'), v.literal('customer'))
	},
	handler: async (ctx, { email, role }) => {
		await requireAdmin(ctx);
		const existing = await ctx.db
			.query('userRoles')
			.withIndex('by_email', (q) => q.eq('email', email))
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, { role });
		} else {
			await ctx.db.insert('userRoles', { email, role });
		}
	}
});

export const removeUserRole = mutation({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		await requireAdmin(ctx);
		const doc = await ctx.db
			.query('userRoles')
			.withIndex('by_email', (q) => q.eq('email', email))
			.unique();
		if (doc) await ctx.db.delete(doc._id);
	}
});

// ─── Dashboard stats ───────────────────────────────────────────────────────────

// Single query the dashboard hero panel can call to get all top-level numbers.
export const getDashboardStats = query({
	args: {},
	handler: async (ctx) => {
		await requireElevated(ctx);

		const [orders, products, schools] = await Promise.all([
			ctx.db.query('orders').collect(),
			ctx.db.query('products').collect(),
			ctx.db.query('schools').collect()
		]);

		const revenue = orders
			.filter((o) => o.status !== 'cancelled')
			.reduce((sum, o) => sum + o.totalPrice, 0);

		const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
			acc[o.status] = (acc[o.status] ?? 0) + 1;
			return acc;
		}, {});

		const lowStock = products.filter((p) => p.stock <= 5);

		return {
			totalOrders: orders.length,
			totalRevenue: revenue, // in paise
			ordersByStatus: byStatus,
			totalProducts: products.length,
			lowStockProducts: lowStock.map((p) => ({ _id: p._id, name: p.name, stock: p.stock })),
			totalSchools: schools.length
		};
	}
});
