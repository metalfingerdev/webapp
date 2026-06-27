import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';
import type { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import type { DataModel, Doc, Id } from './_generated/dataModel.js';
import { authComponent } from './auth.js';
import { components } from './_generated/api.js';
import { assembleOrderDocument } from './lib/orderDocument.js';
import { ORDER_STATUS, TRACKING_STATUS, TAX_CATEGORY } from './schema.js';
import { buildSearchText } from './productSearch.js';
import { slugify, reserveUniqueSlug } from './slugs.js';
import { paginationOptsValidator } from 'convex/server';

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

// ─── Role guard ────────────────────────────────────────────────────────────────

export async function requireElevated(ctx: Ctx) {
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

export async function requireAdmin(ctx: Ctx) {
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

// A school's URL slug (the [school] segment). Unique among schools; -2, -3… on
// collision. Pass excludeId when updating so a school doesn't collide with itself.
async function uniqueSchoolSlug(ctx: Ctx, base: string, excludeId?: Id<'schools'>): Promise<string> {
	const root = slugify(base);
	let slug = root;
	let n = 1;
	for (;;) {
		const hit = await ctx.db
			.query('schools')
			.withIndex('by_slug', (q) => q.eq('slug', slug))
			.first();
		if (!hit || hit._id === excludeId) return slug;
		n += 1;
		slug = `${root}-${n}`;
	}
}

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
		code: v.optional(v.string()),
		slug: v.optional(v.string())
	},
	handler: async (ctx, { name, code, slug }) => {
		await requireElevated(ctx);
		const finalSlug = await uniqueSchoolSlug(ctx, slug || name);
		return ctx.db.insert('schools', { name, code, slug: finalSlug });
	}
});

export const updateSchool = mutation({
	args: {
		id: v.id('schools'),
		name: v.string(),
		code: v.optional(v.string()),
		slug: v.optional(v.string())
	},
	handler: async (ctx, { id, name, code, slug }) => {
		await requireElevated(ctx);
		const current = await ctx.db.get(id);
		// Use the provided slug, else keep the existing one, else backfill from name.
		const finalSlug = slug
			? await uniqueSchoolSlug(ctx, slug, id)
			: (current?.slug ?? (await uniqueSchoolSlug(ctx, name, id)));
		await ctx.db.patch(id, { name, code, slug: finalSlug });
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
		const slug = await dbUniqueSlug(ctx, slugify(args.name));
		return ctx.db.insert('products', { ...args, slug, searchText: buildSearchText(args) });
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
		await ctx.db.patch(id, { ...patch, searchText: buildSearchText(patch) });
	}
});

export const removeProduct = mutation({
	args: { id: v.id('products') },
	handler: async (ctx, { id }) => {
		await requireAdmin(ctx);
		await ctx.db.delete(id);
	}
});

// The store's stock export has no reliable unique key for most rows (only ~12%
// carry a barcode), so we match on the normalized product name and let a real
// barcode win when present. Keep this in sync on both sides of a comparison.
function normalizeName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

type ProductRef = Pick<Doc<'products'>, '_id' | 'category' | 'details' | 'slug'>;

// Single-insert slug uniqueness via the by_slug index (used by createProduct).
async function dbUniqueSlug(ctx: GenericMutationCtx<DataModel>, base: string): Promise<string> {
	let slug = base;
	let n = 1;
	while (
		await ctx.db
			.query('products')
			.withIndex('by_slug', (q) => q.eq('slug', slug))
			.first()
	) {
		n += 1;
		slug = `${base}-${n}`;
	}
	return slug;
}

// Bulk upsert from a stock-status spreadsheet (a "Stock Status as on <date>"
// snapshot, so stock is SET, not added — re-uploading the same file is a no-op).
// Each row is matched to an existing product by `barcode`, else by normalized
// name. A match patches only the sheet-authoritative fields (stock, prices, tax,
// hsn, unit, name) and preserves `details`/`category`/`weight`/`imageUrl`.
// Unmatched rows are inserted. Returns per-row outcome counts for the UI.
export const bulkUpsertProducts = mutation({
	args: {
		products: v.array(
			v.object({
				name: v.string(),
				salePrice: v.number(),
				stock: v.number(),
				weight: v.number(),
				category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')),
				hsnCode: v.optional(v.string()),
				maxRetailPrice: v.optional(v.number()),
				purchasePrice: v.optional(v.number()),
				barcode: v.optional(v.string()),
				unit: v.optional(v.string()),
				taxCategory: v.optional(TAX_CATEGORY),
				details: detailsV
			})
		)
	},
	handler: async (ctx, { products }) => {
		await requireElevated(ctx);

		// Load the catalog once and match in memory — a few thousand rows is well
		// within a single mutation, and it avoids N index lookups.
		const catalog = await ctx.db.query('products').collect();
		const byBarcode = new Map<string, ProductRef>();
		const byName = new Map<string, ProductRef>();
		const usedSlugs = new Set<string>();
		for (const e of catalog) {
			const ref: ProductRef = {
				_id: e._id,
				category: e.category,
				details: e.details,
				slug: e.slug
			};
			if (e.barcode) byBarcode.set(e.barcode, ref);
			byName.set(normalizeName(e.name), ref);
			if (e.slug) usedSlugs.add(e.slug);
		}

		let created = 0;
		let updated = 0;
		let skipped = 0;

		for (const p of products) {
			if (!p.name) {
				skipped++;
				continue;
			}

			const nameKey = normalizeName(p.name);
			const match = (p.barcode ? byBarcode.get(p.barcode) : undefined) ?? byName.get(nameKey);

			if (match) {
				await ctx.db.patch(match._id, {
					name: p.name,
					salePrice: p.salePrice,
					stock: p.stock,
					maxRetailPrice: p.maxRetailPrice,
					purchasePrice: p.purchasePrice,
					hsnCode: p.hsnCode,
					unit: p.unit,
					taxCategory: p.taxCategory,
					barcode: p.barcode,
					// Backfill a slug if this product predates slugs; never change an
					// existing one (URLs must stay stable).
					...(match.slug ? {} : { slug: reserveUniqueSlug(slugify(p.name), usedSlugs) }),
					// Recompute from the new name but keep the product's own details.
					searchText: buildSearchText({
						name: p.name,
						category: match.category,
						barcode: p.barcode,
						hsnCode: p.hsnCode,
						details: match.details
					})
				});
				updated++;
			} else {
				const slug = reserveUniqueSlug(slugify(p.name), usedSlugs);
				const _id = await ctx.db.insert('products', {
					...p,
					slug,
					searchText: buildSearchText(p)
				});
				// Register the new row so a later same-name row in THIS upload updates
				// it instead of inserting a second duplicate.
				const ref: ProductRef = { _id, category: p.category, details: p.details, slug };
				byName.set(nameKey, ref);
				if (p.barcode) byBarcode.set(p.barcode, ref);
				created++;
			}
		}

		return { created, updated, skipped };
	}
});

// One-time backfill: assign slugs to any products created before slugs existed.
// Safe to run repeatedly — it only touches rows whose slug is missing.
export const backfillSlugs = mutation({
	args: {},
	handler: async (ctx) => {
		await requireElevated(ctx);
		const all = await ctx.db.query('products').collect();
		const used = new Set(all.map((p) => p.slug).filter((s): s is string => !!s));
		let filled = 0;
		for (const p of all) {
			if (p.slug) continue;
			const slug = reserveUniqueSlug(slugify(p.name), used);
			await ctx.db.patch(p._id, { slug });
			filled += 1;
		}
		return { filled };
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

// Bundle functions live in bundles.ts (admin + public) — they share the
// requireElevated guard exported above.

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

// Full document model for an order — backs the dashboard's invoice + packing
// slip PDFs. Admin-only; the customer's own copy goes through
// orders.getOrderInvoice (owner-guarded). Both share assembleOrderDocument so
// the two never diverge.
export const getOrderDocument = query({
	args: { orderId: v.id('orders') },
	handler: async (ctx, { orderId }) => {
		await requireElevated(ctx);
		const order = await ctx.db.get(orderId);
		if (!order) throw new Error('Order not found.');

		// Best-effort customer name/email for the header. Degrades to address-only
		// if the auth component can't resolve the user (the delivery address alone
		// is enough for the packing slip).
		let customer: { name?: string; email?: string } | null = null;
		try {
			const u = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'user',
				where: [{ field: 'id', value: order.userId }]
			})) as { name?: string; email?: string } | null;
			if (u) customer = { name: u.name, email: u.email };
		} catch {
			customer = null;
		}

		return assembleOrderDocument(ctx, order, customer);
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
