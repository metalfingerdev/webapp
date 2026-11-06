import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
	addressSnapshot,
	cartLine,
	enquiryStatus,
	gatewayPaymentStatus,
	gender,
	gstRate,
	orderStatus,
	paymentStatus,
	phone,
	productKind,
	refund,
	session,
	setType,
	stockReason,
	uniformPart,
	uniformType
} from './store/validators.js';

export const otpChannelId = v.union(
	v.literal('textbee'),
	v.literal('whatsapp'),
	v.literal('fast2sms'),
	v.literal('console')
);

export const otpDeliveryStatus = v.union(
	v.literal('sent'), // the provider accepted it (not proof of delivery)
	v.literal('failed'),
	v.literal('rate_limited')
);

export default defineSchema({
	// See convex/otp/deliveries.ts
	otpDeliveries: defineTable({
		phoneNumber: v.string(), // E.164
		channel: v.optional(otpChannelId), // unset when rate limited before any channel was tried
		status: otpDeliveryStatus,
		providerMessageId: v.optional(v.string()),
		error: v.optional(v.string())
	}).index('by_phoneNumber', ['phoneNumber']),

	// ---------------------------------------------------------------------------------------------
	// Store. See .agents/skills/store-app/references/data-model.md. Money is integer paise, GST
	// rates are basis points, times are ms since epoch, owners are Better Auth user ids.
	// ---------------------------------------------------------------------------------------------

	categories: defineTable({
		name: v.string(),
		slug: v.string(),
		parentId: v.optional(v.id('categories')),
		sortOrder: v.number(),
		isActive: v.boolean()
	})
		.index('by_slug', ['slug'])
		.index('by_parentId_and_sortOrder', ['parentId', 'sortOrder']),

	// What is sold. Price and stock live on `productVariants`, never here.
	products: defineTable({
		title: v.string(),
		slug: v.string(), // stable once set: product URLs depend on it
		categoryId: v.id('categories'),
		kind: productKind,
		// books
		author: v.optional(v.string()),
		publisher: v.optional(v.string()),
		isbn: v.optional(v.string()),
		edition: v.optional(v.string()),
		subject: v.optional(v.string()),
		// a book's class, or the class range a uniform item is worn in (CLASS_ORDER in model/store/classes.ts)
		classFrom: v.optional(v.number()),
		classTo: v.optional(v.number()),
		// uniforms
		schoolId: v.optional(v.id('schools')),
		gender: v.optional(gender),
		uniformType: v.optional(uniformType),
		part: v.optional(uniformPart),
		// tax, copied into orderItems when ordered
		hsn: v.string(),
		gstRate,
		imageId: v.optional(v.id('_storage')),
		isActive: v.boolean(),
		searchText: v.string() // derived from title, author, ISBN: rebuild on every write
	})
		.index('by_slug', ['slug'])
		.index('by_categoryId_and_isActive', ['categoryId', 'isActive'])
		.index('by_isActive', ['isActive'])
		.index('by_schoolId_and_kind', ['schoolId', 'kind'])
		.index('by_isbn', ['isbn'])
		.searchIndex('search_text', {
			searchField: 'searchText',
			filterFields: ['categoryId', 'kind', 'isActive']
		}),

	// One row per sellable unit: a size (and house colour) of a uniform item, or the single
	// default of a book. Stock is written only by adjustStock (model/store/stock.ts).
	productVariants: defineTable({
		productId: v.id('products'),
		label: v.string(), // "Default", "28", "28 · Red house"
		size: v.optional(v.string()),
		house: v.optional(v.string()),
		sku: v.optional(v.string()),
		mrp: v.number(),
		price: v.number(), // GST-inclusive selling price
		stock: v.number(),
		lowStockAt: v.number(),
		sortOrder: v.number(),
		isActive: v.boolean()
	})
		.index('by_productId_and_sortOrder', ['productId', 'sortOrder'])
		.index('by_sku', ['sku']),

	schools: defineTable({
		name: v.string(),
		slug: v.string(),
		isActive: v.boolean(),
		sortOrder: v.number()
	})
		.index('by_slug', ['slug'])
		.index('by_sortOrder', ['sortOrder']),

	// A list of products, not a priced product: its price is the sum of its lines at checkout.
	// Book sets are per class; uniform sets per gender, uniform type and class range.
	schoolSets: defineTable({
		schoolId: v.id('schools'),
		type: setType,
		label: v.string(), // "Class 1", "Boys regular, Class 1 to 5"
		classFrom: v.number(),
		classTo: v.number(),
		gender: v.optional(gender),
		uniformType: v.optional(uniformType),
		session, // "2026-27": next year's list never edits last year's orders
		sortOrder: v.number(),
		isActive: v.boolean()
	})
		.index('by_schoolId_and_session_and_sortOrder', ['schoolId', 'session', 'sortOrder'])
		.index('by_schoolId_and_label_and_session', ['schoolId', 'label', 'session']),

	setItems: defineTable({
		setId: v.id('schoolSets'),
		productId: v.id('products'),
		// A book line names its variant; a uniform line leaves it out and the parent picks a size.
		variantId: v.optional(v.id('productVariants')),
		quantity: v.number(),
		isOptional: v.boolean(),
		sortOrder: v.number()
	})
		.index('by_setId_and_sortOrder', ['setId', 'sortOrder'])
		.index('by_productId', ['productId']),

	carts: defineTable({
		userId: v.string(),
		lines: v.array(cartLine), // capped by MAX_CART_LINES
		updatedAt: v.number()
	}).index('by_userId', ['userId']),

	addresses: defineTable({
		userId: v.string(),
		...addressSnapshot.fields,
		isDefault: v.boolean()
	}).index('by_userId', ['userId']),

	orders: defineTable({
		userId: v.string(),
		number: v.string(), // readable and unique
		status: orderStatus,
		paymentStatus,
		address: addressSnapshot, // a copy, so editing the address book never changes an order
		subtotal: v.number(),
		shippingFee: v.number(),
		total: v.number(),
		placedAt: v.number(),
		paidAt: v.optional(v.number()),
		packedAt: v.optional(v.number()),
		shippedAt: v.optional(v.number()),
		deliveredAt: v.optional(v.number()),
		cancelledAt: v.optional(v.number()),
		refund: v.optional(refund)
	})
		.index('by_userId_and_placedAt', ['userId', 'placedAt'])
		.index('by_status_and_placedAt', ['status', 'placedAt'])
		.index('by_number', ['number']),

	// Snapshots: editing a product later must not rewrite old orders or invoices.
	orderItems: defineTable({
		orderId: v.id('orders'),
		productId: v.id('products'),
		variantId: v.id('productVariants'),
		title: v.string(),
		variantLabel: v.optional(v.string()),
		isbn: v.optional(v.string()),
		hsn: v.string(),
		gstRate,
		unitPrice: v.number(),
		quantity: v.number(),
		fromSetId: v.optional(v.id('schoolSets'))
	}).index('by_orderId', ['orderId']),

	stockAdjustments: defineTable({
		variantId: v.id('productVariants'),
		productId: v.id('products'),
		delta: v.number(),
		stockAfter: v.number(),
		reason: stockReason,
		orderId: v.optional(v.id('orders')),
		by: v.string(), // the admin's user id, or "system"
		at: v.number()
	}).index('by_variantId_and_at', ['variantId', 'at']),

	shipments: defineTable({
		orderId: v.id('orders'),
		courier: v.string(),
		awb: v.string(),
		trackingUrl: v.optional(v.string()),
		shippedAt: v.number(),
		deliveredAt: v.optional(v.number())
	})
		.index('by_orderId', ['orderId'])
		.index('by_awb', ['awb']),

	payments: defineTable({
		orderId: v.id('orders'),
		gatewayOrderId: v.string(),
		gatewayPaymentId: v.optional(v.string()),
		amount: v.number(),
		status: gatewayPaymentStatus,
		refund: v.optional(refund),
		createdAt: v.number()
	})
		.index('by_orderId', ['orderId'])
		.index('by_gatewayOrderId', ['gatewayOrderId']),

	enquiries: defineTable({
		name: v.string(),
		email: v.string(),
		phone,
		bookName: v.optional(v.string()),
		author: v.optional(v.string()),
		classLevel: v.optional(v.string()),
		status: enquiryStatus,
		note: v.optional(v.string()),
		createdAt: v.number()
	}).index('by_status_and_createdAt', ['status', 'createdAt']),

	// A single row. Business details are typed into /admin/settings, never committed (public repo).
	storeSettings: defineTable({
		businessName: v.string(),
		legalName: v.optional(v.string()),
		phone: v.optional(v.string()),
		whatsapp: v.optional(v.string()),
		email: v.optional(v.string()),
		address: v.optional(v.string()),
		gstin: v.optional(v.string()),
		shippingFee: v.number(),
		freeShippingFrom: v.number(),
		returnWindowDays: v.number(),
		invoicePrefix: v.optional(v.string()),
		currentSession: session,
		placedOrdersOpen: v.boolean()
	}),

	invoiceCounters: defineTable({
		financialYear: v.string(), // "2026-27", April to March
		next: v.number()
	}).index('by_financialYear', ['financialYear'])
});
