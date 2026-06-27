import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const CUSTOMER_ROLE = v.union(
	v.literal('admin'),
	v.literal('developer'),
	v.literal('customer')
);

export const ORDER_STATUS = v.union(
	v.literal('pending'),
	v.literal('confirmed'),
	v.literal('processing'),
	v.literal('shipped'),
	v.literal('delivered'),
	v.literal('cancelled')
);

export const TRACKING_STATUS = v.union(
	v.literal('order_placed'),
	v.literal('processing'),
	v.literal('dispatched'),
	v.literal('in_transit'),
	v.literal('out_for_delivery'),
	v.literal('delivered')
);

export const TAX_CATEGORY = v.union(
	v.literal('Exempt'),
	v.literal('GST 0%'),
	v.literal('GST 5%'),
	v.literal('GST 12 to 5%'),
	v.literal('GST 12 to 0%'),
	v.literal('GST 12 to 18%'),
	v.literal('GST 18%'),
	v.literal('None')
);

export default defineSchema({
	products: defineTable({
		name: v.string(),
		weight: v.number(),
		imageUrl: v.optional(v.string()),
		category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')),
		maxRetailPrice: v.optional(v.number()),
		purchasePrice: v.optional(v.number()),
		salePrice: v.number(),
		hsnCode: v.optional(v.string()),
		taxCategory: v.optional(TAX_CATEGORY),
		stock: v.number(),
		unit: v.optional(v.string()),
		barcode: v.optional(v.string()),
		// URL slug (e.g. "ganga-hindi-2"). Generated once on insert and kept
		// stable across renames so product URLs don't break. Optional so existing
		// rows validate before the backfill runs.
		slug: v.optional(v.string()),
		details: v.union(
			v.object({
				type: v.literal('book'),
				author: v.string(),
				school: v.optional(v.id('schools')),
				subject: v.string()
			}),
			v.object({
				type: v.literal('clothes'),
				gender: v.string(),
				school: v.optional(v.id('schools')),
				size: v.string(),
				variant: v.union(v.literal('sports'), v.literal('white'))
			}),
			v.object({
				type: v.literal('stationary'),
				itemType: v.string()
			})
		),
		searchText: v.string()
	})
		.index('by_category', ['category'])
		// Price-ordered indexes back the shop's price sort + price-range filter.
		.index('by_category_price', ['category', 'salePrice'])
		.index('by_salePrice', ['salePrice'])
		.index('by_barcode', ['barcode'])
		.index('by_hsn', ['hsnCode'])
		.index('by_slug', ['slug'])
		.searchIndex('search_name', {
			searchField: 'searchText',
			filterFields: ['category']
		}),

	userRoles: defineTable({
		email: v.string(),
		role: CUSTOMER_ROLE
	}).index('by_email', ['email']),

	cartItems: defineTable({
		userId: v.string(),
		productId: v.id('products'),
		quantity: v.number(),
		addedAt: v.number(),
		savedForLater: v.optional(v.boolean())
	})
		.index('by_userId', ['userId'])
		.index('by_userId_product', ['userId', 'productId']),

	schools: defineTable({
		name: v.string(),
		code: v.optional(v.string())
	}),

	bundles: defineTable({
		schoolId: v.id('schools'),
		grade: v.string(),
		productId: v.id('products')
	})
		.index('by_productId', ['productId'])
		.index('by_school_grade', ['schoolId', 'grade'])
		.index('by_school_grade_product', ['schoolId', 'grade', 'productId']),

	orders: defineTable({
		userId: v.string(),
		status: ORDER_STATUS,
		totalPrice: v.number(),
		createdAt: v.number(),
		paymentId: v.optional(v.string()),
		address: v.id('addresses'),
		shipping: v.number(),
		trackingId: v.optional(v.string())
	})
		.index('by_userId', ['userId'])
		.index('by_status', ['status']),

	addresses: defineTable({
		label: v.optional(v.string()),
		street: v.string(),
		city: v.string(),
		state: v.string(),
		pincode: v.string(),
		userId: v.string()
	}).index('by_userId', ['userId']),

	tracking: defineTable({
		orderId: v.id('orders'),
		status: TRACKING_STATUS,
		carrier: v.optional(v.string()),
		location: v.optional(v.string()),
		message: v.optional(v.string()),
		timestamp: v.number()
	}).index('by_orderId', ['orderId']),

	settings: defineTable({
		key: v.string(),
		value: v.number()
	}).index('by_key', ['key']),

	purchases: defineTable({
		orderId: v.id('orders'),
		productId: v.id('products'),
		quantity: v.number(),
		priceAtPurchase: v.number()
	})
		.index('by_orderId', ['orderId'])
		.index('by_productId', ['productId'])
});
