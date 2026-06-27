// convex/lib/orderDocument.ts
//
// Single source of truth for the data behind the invoice and packing-slip PDFs.
// Both the customer's invoice (orders.getOrderInvoice) and the dashboard's
// packing slip (dashboard.getOrderDocument) call this so the two documents can
// never drift apart. The PDF renderers on the client are pure presentation —
// all amounts, GST splits and ordering are decided here, server-side.
import type { DatabaseReader } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';
import { loadSettings } from './settings.js';
import { calculateOrder, type OrderLine } from './pricing.js';

export interface OrderDocumentLine {
	sr: number;
	name: string;
	hsnCode: string; // '' when the product has none
	gstLabel: string; // 'Exempt' | '5%' | '12%' | '18%'
	quantity: number;
	unitPrice: number; // paise, GST-inclusive
	lineTotal: number; // paise (unitPrice * quantity)
}

export interface OrderDocumentTotals {
	subtotal: number; // paise
	shipping: number; // paise
	total: number; // paise
	// Flattened CGST/SGST rows for the invoice footer, e.g.
	// [{ label: 'CGST 6%', amount: 1608 }, { label: 'SGST 6%', amount: 1608 }, …]
	taxBreakdown: { label: string; amount: number }[];
}

export interface OrderDocument {
	orderRef: string; // short human reference (last 8 of the id, upper-cased)
	orderId: string; // full Convex id
	createdAt: number;
	status: string;
	paymentMethod: string;
	shippingMethod: string;
	customer: { name?: string; email?: string } | null;
	address: {
		label?: string;
		street: string;
		city: string;
		state: string;
		pincode: string;
	} | null;
	lines: OrderDocumentLine[];
	totals: OrderDocumentTotals;
	notes?: string;
}

/**
 * Builds the full document model for one order. Caller supplies `customer`
 * (the user route already has the session user; the dashboard resolves it
 * best-effort) so this stays free of auth concerns.
 *
 * Amounts: line prices come from `priceAtPurchase` (what was actually charged),
 * the GST split is back-calculated from those via the shared pricing logic, and
 * shipping/total are read from the *stored* order so the invoice always matches
 * the money that changed hands — even if settings change later.
 */
export async function assembleOrderDocument(
	ctx: { db: DatabaseReader },
	order: Doc<'orders'>,
	customer: { name?: string; email?: string } | null
): Promise<OrderDocument> {
	const [purchases, address, settings] = await Promise.all([
		ctx.db
			.query('purchases')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.collect(),
		ctx.db.get(order.address),
		loadSettings(ctx.db)
	]);

	const products = await Promise.all(purchases.map((p) => ctx.db.get(p.productId)));

	const orderLines: OrderLine[] = purchases.map((p, i) => {
		const prod = products[i];
		return {
			productId: p.productId,
			name: prod?.name ?? 'Unknown item',
			weight: prod?.weight ?? 0,
			hsnCode: prod?.hsnCode,
			taxCategory: prod?.taxCategory,
			quantity: p.quantity,
			unitPrice: p.priceAtPurchase
		};
	});

	const totalWeight = orderLines.reduce((sum, l) => sum + l.weight * l.quantity, 0);
	const priced = calculateOrder(orderLines, totalWeight, settings);

	const lines: OrderDocumentLine[] = priced.lines.map((l, i) => ({
		sr: i + 1,
		name: l.name,
		hsnCode: l.hsnCode ?? '',
		gstLabel: l.tax.gstRate === 0 ? 'Exempt' : `${Math.round(l.tax.gstRate * 100)}%`,
		quantity: l.quantity,
		unitPrice: l.unitPrice,
		lineTotal: l.lineTotal
	}));

	// Group the breakdown by rate (ascending), CGST then SGST within each rate —
	// matches the "(includes ₹.. CGST 6%, ₹.. SGST 6%, …)" line on the sample.
	const rateLabels = Array.from(
		new Set([...Object.keys(priced.cgstBreakdown), ...Object.keys(priced.sgstBreakdown)])
	).sort((a, b) => parseFloat(a) - parseFloat(b));
	const taxBreakdown: { label: string; amount: number }[] = [];
	for (const rate of rateLabels) {
		if (priced.cgstBreakdown[rate]) taxBreakdown.push({ label: `CGST ${rate}`, amount: priced.cgstBreakdown[rate] });
		if (priced.sgstBreakdown[rate]) taxBreakdown.push({ label: `SGST ${rate}`, amount: priced.sgstBreakdown[rate] });
	}

	return {
		orderRef: order._id.slice(-8).toUpperCase(),
		orderId: order._id,
		createdAt: order.createdAt,
		status: order.status,
		paymentMethod: order.paymentId ? 'Prepaid' : 'Pending',
		shippingMethod: order.shipping > 0 ? 'Flat rate' : 'Free shipping',
		customer,
		address: address
			? {
					label: address.label,
					street: address.street,
					city: address.city,
					state: address.state,
					pincode: address.pincode
				}
			: null,
		lines,
		// subtotal from the priced lines; shipping/total from the stored order.
		totals: {
			subtotal: priced.subtotal,
			shipping: order.shipping,
			total: order.totalPrice,
			taxBreakdown
		}
	};
}
