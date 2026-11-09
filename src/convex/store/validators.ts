// Shared validators for the store tables and functions. Reuse these instead of re-declaring
// literal unions, so the schema and the functions can't drift apart.
import { v, type Infer } from 'convex/values';

/** What a product is. Uniforms have sizes; books and stationery have one default variant. */
export const productKind = v.union(
	v.literal('book'),
	v.literal('uniform'),
	v.literal('stationery')
);
export type ProductKind = Infer<typeof productKind>;

export const gender = v.union(v.literal('boys'), v.literal('girls'), v.literal('unisex'));
export type Gender = Infer<typeof gender>;

/** Each school has a regular and a sports uniform, plus winter wear. */
export const uniformType = v.union(v.literal('regular'), v.literal('sports'), v.literal('winter'));
export type UniformType = Infer<typeof uniformType>;

/** Which part of the uniform a product is: a uniform is a top and a bottom, plus accessories. */
export const uniformPart = v.union(
	v.literal('top'),
	v.literal('bottom'),
	v.literal('accessory'),
	v.literal('footwear')
);

export const setType = v.union(v.literal('books'), v.literal('uniform'));

/**
 * GST rate in basis points (1800 = 18%), or exempt. Which rate applies to what is for the
 * client's CA to confirm (store-profile.md), not for code to decide.
 */
export const gstRate = v.union(
	v.literal(0),
	v.literal(500),
	v.literal(1200),
	v.literal(1800),
	v.literal(2800),
	v.literal('exempt')
);
export type GstRate = Infer<typeof gstRate>;

/** Academic session label such as "2026-27". Checked with `isSession`. */
export const session = v.string();
export const isSession = (value: string) => {
	const match = /^(\d{4})-(\d{2})$/.exec(value);
	return match !== null && (Number(match[1]) + 1) % 100 === Number(match[2]);
};

/** Indian PIN code: 6 digits, not starting with 0. Checked with `isIndianPincode`. */
export const indianPincode = v.string();
export const isIndianPincode = (value: string) => /^[1-9]\d{5}$/.test(value);

/** Phone numbers are E.164; reuse `normalizeIndianMobile` from `otp/phone.ts`. */
export const phone = v.string();

export const orderStatus = v.union(
	v.literal('awaiting_payment'),
	// Cash on delivery: accepted and waiting to be packed. Online orders go awaiting_payment, paid.
	v.literal('confirmed'),
	v.literal('paid'),
	v.literal('packed'),
	v.literal('shipped'),
	v.literal('delivered'),
	v.literal('cancelled')
);
export type OrderStatus = Infer<typeof orderStatus>;

export const paymentStatus = v.union(
	v.literal('pending'),
	v.literal('paid'),
	v.literal('failed'),
	v.literal('refunded')
);

export const paymentMethod = v.union(v.literal('online'), v.literal('cod'));
export type PaymentMethod = Infer<typeof paymentMethod>;

/** How a zone is served: the shop's own delivery nearby, or a courier with a tracking number */
export const deliveryMethod = v.union(v.literal('local'), v.literal('courier'));
export type DeliveryMethod = Infer<typeof deliveryMethod>;

/** A customer's request to return an order after it arrived; the shop answers it in the admin */
export const returnRequest = v.object({
	reason: v.string(),
	requestedAt: v.number(),
	status: v.union(v.literal('requested'), v.literal('approved'), v.literal('rejected'))
});

export const gatewayPaymentStatus = v.union(
	v.literal('creating'),
	v.literal('created'),
	v.literal('paid'),
	v.literal('failed'),
	v.literal('refunded')
);

/** Why stock changed. Every change writes a `stockAdjustments` row with one of these. */
export const stockReason = v.union(
	v.literal('received'),
	v.literal('damaged'),
	v.literal('count'),
	v.literal('order'),
	v.literal('cancel'),
	v.literal('import')
);
export type StockReason = Infer<typeof stockReason>;

/**
 * The reasons an admin may give for a change by hand. A shelf count has its own function
 * (`store/admin/stock.ts#count`); `order`, `cancel` and `import` come from code.
 */
export const manualStockReason = v.union(v.literal('received'), v.literal('damaged'));

export const enquiryStatus = v.union(v.literal('new'), v.literal('quoted'), v.literal('closed'));

/** Money going back to the customer: asked of the gateway (pending), then processed or failed */
export const refundStatus = v.union(
	v.literal('pending'),
	v.literal('processed'),
	v.literal('failed')
);

export const refund = v.object({
	amount: v.number(), // paise
	at: v.number(),
	status: refundStatus,
	gatewayRefundId: v.optional(v.string())
});

export const addressSnapshot = v.object({
	name: v.string(),
	phone,
	line1: v.string(),
	line2: v.optional(v.string()),
	landmark: v.optional(v.string()),
	city: v.string(),
	state: v.string(),
	pincode: indianPincode
});

/** One cart line: a variant (a size, or a book's default) and how many. */
export const cartLine = v.object({
	variantId: v.id('productVariants'),
	quantity: v.number(),
	fromSetId: v.optional(v.id('schoolSets'))
});

/** One row of the tax inside an order's total, by rate in basis points ('exempt' counts as 0) */
export const taxRow = v.object({ gstRate: v.number(), taxable: v.number(), tax: v.number() });

/** Who the invoice is from. A copy of the settings at the time it was issued. */
export const invoiceSeller = v.object({
	name: v.string(),
	address: v.optional(v.string()),
	gstin: v.optional(v.string()),
	phone: v.optional(v.string()),
	email: v.optional(v.string())
});

/** Frozen on the order when it ships: later edits to settings or products never change it */
export const invoice = v.object({
	number: v.string(), // "AK/26-27/0001"
	financialYear: v.string(), // "2026-27", April to March
	issuedAt: v.number(),
	seller: invoiceSeller,
	taxByRate: v.array(taxRow)
});

/** The invoice, as the PDF needs it. Amounts are the ones stored on the order. Lines sit under the set they came from (no label: bought one by one). */
export const invoiceDocument = v.object({
	number: v.string(),
	issuedAt: v.number(),
	orderNumber: v.string(),
	placedAt: v.number(),
	paymentMethod,
	seller: invoiceSeller,
	buyer: addressSnapshot,
	groups: v.array(
		v.object({
			label: v.optional(v.string()),
			lines: v.array(
				v.object({
					title: v.string(),
					variantLabel: v.optional(v.string()),
					hsn: v.string(),
					gstRate,
					unitPrice: v.number(),
					quantity: v.number()
				})
			)
		})
	),
	subtotal: v.number(),
	shippingFee: v.number(),
	total: v.number(),
	taxByRate: v.array(taxRow)
});
export type InvoiceDocument = Infer<typeof invoiceDocument>;

/** The packing slip: what to pack and where it goes. It has no price field at all. */
export const packingSlipDocument = v.object({
	orderNumber: v.string(),
	placedAt: v.number(),
	paymentMethod,
	zoneName: v.string(),
	deliveryMethod,
	seller: invoiceSeller,
	buyer: addressSnapshot,
	groups: v.array(
		v.object({
			label: v.optional(v.string()),
			lines: v.array(
				v.object({
					title: v.string(),
					variantLabel: v.optional(v.string()),
					quantity: v.number()
				})
			)
		})
	),
	shipment: v.optional(v.object({ courier: v.string(), awb: v.string() }))
});
export type PackingSlipDocument = Infer<typeof packingSlipDocument>;
