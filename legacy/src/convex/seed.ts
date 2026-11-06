// convex/seed.ts
export const SETTINGS = [
	// Shipping
	{ key: 'shipping.flatRate', value: 30000 }, // ₹300 in paise
	{ key: 'shipping.freeThreshold', value: 500000 }, // free above ₹5000
	{ key: 'shipping.perKgRate', value: 0 }, // 0 = flat rate mode

	// GST rates (stored as basis points: 500 = 5%, 1800 = 18%)
	{ key: 'gst.rate.5', value: 500 },
	{ key: 'gst.rate.12', value: 1200 },
	{ key: 'gst.rate.18', value: 1800 },

	// GST split (CGST/SGST are always equal halves of the total GST)
	{ key: 'gst.cgstFraction', value: 5000 }, // 50% of total GST = CGST
	{ key: 'gst.sgstFraction', value: 5000 }, // 50% of total GST = SGST

	// Rounding
	{ key: 'order.roundingMode', value: 0 } // 0 = no rounding, 1 = round to nearest rupee
];
