import { describe, it, expect } from 'vitest';
import { calculateOrder, type OrderLine, type TaxCategory } from './pricing.js';
import { DEFAULT_SETTINGS, type Settings } from './settings.js';

// ---------------------------------------------------------------------------
// calculateOrder — GST-inclusive money math.
//
// All money is integer paise; GST rates are basis points in Settings
// (1800 => 18%). Prices stored in the DB are GST-INCLUSIVE, so tax is
// back-calculated: taxableAmount = round(price / (1 + rate)).
// ---------------------------------------------------------------------------

/** A valid baseline line; spread overrides on top for each case. */
function makeLine(overrides: Partial<OrderLine> = {}): OrderLine {
	return {
		productId: 'p1',
		name: 'Sample',
		weight: 500,
		quantity: 1,
		unitPrice: 11800, // ₹118, GST-inclusive
		taxCategory: 'GST 18%',
		...overrides
	};
}

describe('calculateOrder — tax extraction from GST-inclusive prices', () => {
	it('splits an 18% GST-inclusive line into taxable + equal CGST/SGST', () => {
		const order = calculateOrder([makeLine({ unitPrice: 11800 })], 500, DEFAULT_SETTINGS);
		const tax = order.lines[0].tax;

		expect(tax.taxableAmount).toBe(10000); // 11800 / 1.18
		expect(tax.totalTax).toBe(1800);
		expect(tax.cgst).toBe(900);
		expect(tax.sgst).toBe(900);
		expect(tax.gstRate).toBe(0.18);
	});

	it('maps each tax category to the configured rate', () => {
		const cases: { category: TaxCategory; unitPrice: number; rate: number; taxable: number }[] = [
			{ category: 'GST 5%', unitPrice: 10500, rate: 0.05, taxable: 10000 },
			{ category: 'GST 12 to 18%', unitPrice: 11200, rate: 0.12, taxable: 10000 },
			{ category: 'GST 12 to 5%', unitPrice: 10500, rate: 0.05, taxable: 10000 },
			{ category: 'GST 18%', unitPrice: 11800, rate: 0.18, taxable: 10000 }
		];

		for (const c of cases) {
			const order = calculateOrder(
				[makeLine({ unitPrice: c.unitPrice, taxCategory: c.category })],
				500,
				DEFAULT_SETTINGS
			);
			expect(order.lines[0].tax.gstRate).toBe(c.rate);
			expect(order.lines[0].tax.taxableAmount).toBe(c.taxable);
		}
	});

	it('treats Exempt / GST 0% / None as zero-tax and omits them from breakdowns', () => {
		for (const category of ['Exempt', 'GST 0%', 'None'] as TaxCategory[]) {
			const order = calculateOrder(
				[makeLine({ unitPrice: 5000, taxCategory: category })],
				500,
				DEFAULT_SETTINGS
			);
			expect(order.lines[0].tax.totalTax).toBe(0);
			expect(order.totalTax).toBe(0);
			expect(order.cgstBreakdown).toEqual({});
			expect(order.sgstBreakdown).toEqual({});
		}
	});

	it('keeps CGST + SGST exactly equal to totalTax even when the split is odd (no drift)', () => {
		// 10100 / 1.05 = 9619.04… → taxable 9619, totalTax 481 (odd)
		const order = calculateOrder(
			[makeLine({ unitPrice: 10100, taxCategory: 'GST 5%' })],
			500,
			DEFAULT_SETTINGS
		);
		const tax = order.lines[0].tax;

		expect(tax.totalTax).toBe(481);
		expect(tax.cgst).toBe(241); // round(240.5) up
		expect(tax.sgst).toBe(240); // remainder
		expect(tax.cgst + tax.sgst).toBe(tax.totalTax);
	});

	it('multiplies the line total by quantity before extracting tax', () => {
		const order = calculateOrder(
			[makeLine({ unitPrice: 11800, quantity: 3 })],
			500,
			DEFAULT_SETTINGS
		);

		expect(order.lines[0].lineTotal).toBe(35400);
		expect(order.lines[0].tax.taxableAmount).toBe(30000);
		expect(order.lines[0].tax.totalTax).toBe(5400);
	});
});

describe('calculateOrder — totals and breakdowns', () => {
	it('sums line totals into subtotal and aggregates CGST/SGST by rate label', () => {
		const order = calculateOrder(
			[
				makeLine({ productId: 'a', unitPrice: 11800, taxCategory: 'GST 18%' }), // "9%"
				makeLine({ productId: 'b', unitPrice: 11200, taxCategory: 'GST 12 to 18%' }), // "6%"
				makeLine({ productId: 'c', unitPrice: 10500, taxCategory: 'GST 5%' }) // "2.5%"
			],
			1500,
			DEFAULT_SETTINGS
		);

		expect(order.subtotal).toBe(11800 + 11200 + 10500);
		expect(order.cgstBreakdown).toEqual({ '9%': 900, '6%': 600, '2.5%': 250 });
		expect(order.sgstBreakdown).toEqual({ '9%': 900, '6%': 600, '2.5%': 250 });
		// order totalTax equals the sum of per-line taxes
		const sumLineTax = order.lines.reduce((s, l) => s + l.tax.totalTax, 0);
		expect(order.totalTax).toBe(sumLineTax);
	});

	it('combines same-rate lines into a single breakdown bucket', () => {
		const order = calculateOrder(
			[
				makeLine({ productId: 'a', unitPrice: 11800, taxCategory: 'GST 18%' }),
				makeLine({ productId: 'b', unitPrice: 11800, taxCategory: 'GST 18%' })
			],
			1000,
			DEFAULT_SETTINGS
		);
		expect(order.cgstBreakdown).toEqual({ '9%': 1800 });
		expect(order.sgstBreakdown).toEqual({ '9%': 1800 });
	});
});

describe('calculateOrder — shipping', () => {
	it('charges weight-based shipping below the free threshold when perKgRate > 0', () => {
		// 500g at ₹40/kg → round(0.5 * 4000) = 2000 paise
		const order = calculateOrder([makeLine({ unitPrice: 11800 })], 500, DEFAULT_SETTINGS);
		expect(order.shipping).toBe(2000);
		expect(order.grandTotal).toBe(order.subtotal + order.shipping);
	});

	it('is free at or above the free-shipping threshold', () => {
		const order = calculateOrder(
			[makeLine({ unitPrice: 500000, taxCategory: 'GST 0%' })], // ₹5000 == threshold
			800,
			DEFAULT_SETTINGS
		);
		expect(order.shipping).toBe(0);
		expect(order.grandTotal).toBe(500000);
	});

	it('falls back to the flat rate when perKgRate is 0', () => {
		const settings: Settings = { ...DEFAULT_SETTINGS, 'shipping.perKgRate': 0 };
		const order = calculateOrder([makeLine({ unitPrice: 11800 })], 500, settings);
		expect(order.shipping).toBe(settings['shipping.flatRate']);
		expect(order.shipping).toBe(5000);
	});

	it('grandTotal never includes tax on top — prices are already GST-inclusive', () => {
		const order = calculateOrder([makeLine({ unitPrice: 11800 })], 500, DEFAULT_SETTINGS);
		// subtotal + shipping only; tax lives inside subtotal
		expect(order.grandTotal).toBe(order.subtotal + order.shipping);
		expect(order.grandTotal).not.toBe(order.subtotal + order.shipping + order.totalTax);
	});
});
