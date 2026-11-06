// convex/lib/pricing.ts
import type { Settings } from './settings.js';

export type TaxCategory =
	| 'Exempt'
	| 'GST 0%'
	| 'GST 5%'
	| 'GST 12 to 5%'
	| 'GST 12 to 0%'
	| 'GST 12 to 18%'
	| 'GST 18%'
	| 'None';

export interface OrderLine {
	productId: string;
	name: string;
	weight: number;
	hsnCode?: string;
	taxCategory?: TaxCategory;
	quantity: number;
	unitPrice: number; // salePrice from DB, GST-inclusive, in paise
}

export interface LineTax {
	taxableAmount: number; // price ex-GST
	gstRate: number; // e.g. 0.18
	cgst: number;
	sgst: number;
	totalTax: number;
}

export interface PricedLine extends OrderLine {
	lineTotal: number; // unitPrice * quantity
	tax: LineTax;
}

export interface OrderTotals {
	lines: PricedLine[];
	subtotal: number; // sum of lineTotals
	shipping: number;
	totalTax: number;
	cgstBreakdown: Record<string, number>; // { '6%': 1608, '9%': 991 }
	sgstBreakdown: Record<string, number>;
	grandTotal: number;
}

// Back-calculate tax from GST-inclusive price
// Formula: taxAmount = price - (price / (1 + rate))
function extractTax(inclusivePrice: number, rate: number): LineTax {
	const cgstFraction = 0.5; // always equal split

	const taxableAmount = Math.round(inclusivePrice / (1 + rate));
	const totalTax = inclusivePrice - taxableAmount;
	const cgst = Math.round(totalTax * cgstFraction);
	const sgst = totalTax - cgst; // remainder to avoid rounding drift

	return { taxableAmount, gstRate: rate, cgst, sgst, totalTax };
}

function getGstRate(taxCategory: TaxCategory | undefined, s: Settings): number {
	switch (taxCategory) {
		case 'GST 5%':
		case 'GST 12 to 5%':
		case 'GST 12 to 0%':
			return s['gst.rate.5'] / 10000;
		case 'GST 12 to 18%':
			return s['gst.rate.12'] / 10000;
		case 'GST 18%':
			return s['gst.rate.18'] / 10000;
		case 'Exempt':
		case 'GST 0%':
		case 'None':
		default:
			return 0;
	}
}

function calculateShipping(subtotal: number, totalWeight: number, s: Settings): number {
	if (subtotal >= s['shipping.freeThreshold']) return 0;
	if (s['shipping.perKgRate'] > 0) {
		return Math.round((totalWeight / 1000) * s['shipping.perKgRate']);
	}
	return s['shipping.flatRate'];
}

export function calculateOrder(
	lines: OrderLine[],
	totalWeightGrams: number,
	s: Settings
): OrderTotals {
	const pricedLines: PricedLine[] = lines.map((line) => {
		const lineTotal = line.unitPrice * line.quantity;
		const rate = getGstRate(line.taxCategory, s);
		const tax = extractTax(lineTotal, rate);
		return { ...line, lineTotal, tax };
	});

	const subtotal = pricedLines.reduce((sum, l) => sum + l.lineTotal, 0);
	const shipping = calculateShipping(subtotal, totalWeightGrams, s);

	// Build CGST/SGST breakdown by rate for invoice display
	const cgstBreakdown: Record<string, number> = {};
	const sgstBreakdown: Record<string, number> = {};

	for (const line of pricedLines) {
		if (line.tax.gstRate === 0) continue;
		const rateLabel = `${(line.tax.gstRate * 100) / 2}%`; // "9%" for 18% GST
		cgstBreakdown[rateLabel] = (cgstBreakdown[rateLabel] ?? 0) + line.tax.cgst;
		sgstBreakdown[rateLabel] = (sgstBreakdown[rateLabel] ?? 0) + line.tax.sgst;
	}

	const totalTax = pricedLines.reduce((sum, l) => sum + l.tax.totalTax, 0);
	const grandTotal = subtotal + shipping;

	return {
		lines: pricedLines,
		subtotal,
		shipping,
		totalTax,
		cgstBreakdown,
		sgstBreakdown,
		grandTotal
	};
}
