// The money maths: delivery is free exactly at the threshold, and tax is worked out of the price.
import { describe, expect, it } from 'vitest';
import { priceCart } from './pricing';

describe('priceCart', () => {
	const zone = { fee: 4000, freeFrom: 50000 };

	it('charges delivery below the threshold and nothing at it', () => {
		expect(priceCart([{ unitPrice: 49999, quantity: 1, gstRate: 0 }], zone).shippingFee).toBe(4000);
		expect(priceCart([{ unitPrice: 25000, quantity: 2, gstRate: 0 }], zone).shippingFee).toBe(0);
	});

	it('takes tax out of a GST-inclusive price instead of adding it', () => {
		const price = priceCart([{ unitPrice: 11800, quantity: 1, gstRate: 1800 }], {
			fee: 0,
			freeFrom: 0
		});
		expect(price.total).toBe(11800);
		expect(price.taxByRate).toEqual([{ gstRate: 1800, taxable: 10000, tax: 1800 }]);
	});
});
