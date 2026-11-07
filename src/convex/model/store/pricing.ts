// What a cart costs. One pure function, used for the checkout preview and again inside `placeOrder`,
// so the screen and the order can never disagree. All paise; prices already include GST, so tax is
// worked back out of the price, never added on top.
import type { GstRate } from '../../store/validators.js';

export type PricedLine = { unitPrice: number; quantity: number; gstRate: GstRate };
export type ZoneRates = { fee: number; freeFrom: number };

export type CartPrice = {
	subtotal: number;
	shippingFee: number;
	total: number;
	/** The tax inside the subtotal, by rate in basis points ('exempt' and 0 count as no tax) */
	taxByRate: { gstRate: number; taxable: number; tax: number }[];
};

export const priceCart = (lines: PricedLine[], zone: ZoneRates): CartPrice => {
	const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
	// An empty cart pays nothing; otherwise delivery is free once the subtotal reaches the threshold
	const shippingFee = lines.length === 0 || subtotal >= zone.freeFrom ? 0 : zone.fee;

	const byRate = new Map<number, number>();
	for (const line of lines) {
		const rate = line.gstRate === 'exempt' ? 0 : line.gstRate;
		byRate.set(rate, (byRate.get(rate) ?? 0) + line.unitPrice * line.quantity);
	}
	const taxByRate = [...byRate.entries()]
		.sort(([a], [b]) => a - b)
		.map(([gstRate, gross]) => {
			const tax = Math.round((gross * gstRate) / (10_000 + gstRate));
			return { gstRate, taxable: gross - tax, tax };
		});

	return { subtotal, shippingFee, total: subtotal + shippingFee, taxByRate };
};
