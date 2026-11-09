// The data behind the invoice and the packing slip, worked out here and only drawn by the client, so
// the two documents and the order page can never disagree. The invoice reads what was frozen on the
// order when it shipped; the packing slip reads the settings as they are now and carries no prices.
import type { Doc } from '../../_generated/dataModel.js';
import type { QueryCtx } from '../../_generated/server.js';
import type { InvoiceDocument, PackingSlipDocument } from '../../store/validators.js';
import { sellerFromSettings } from './invoices.js';

/** The school and the set a line came from, as written on the order: "Ryan International School · Class 3 books" */
export const setLabelFor = (schoolName: string, set: Doc<'schoolSets'>) =>
	`${schoolName} · ${set.label} ${set.type === 'books' ? 'books' : 'uniform'}`;

const loadItems = (ctx: QueryCtx, orderId: Doc<'orders'>['_id']) =>
	ctx.db
		.query('orderItems')
		.withIndex('by_orderId', (q) => q.eq('orderId', orderId))
		.take(100);

/** Lines under the set they came from, in the order each set first appears; lines bought one by one share one unlabelled group */
const groupBySet = <Line extends { setLabel?: string }, Out>(
	items: Line[],
	pick: (item: Line) => Out
) => {
	const groups = new Map<string | undefined, Out[]>();
	for (const item of items) {
		const lines = groups.get(item.setLabel) ?? [];
		lines.push(pick(item));
		groups.set(item.setLabel, lines);
	}
	return [...groups.entries()].map(([label, lines]) => ({ label, lines }));
};

/** The invoice, or null while the order has not shipped (an invoice is issued then, never before) */
export const buildInvoiceDocument = async (
	ctx: QueryCtx,
	order: Doc<'orders'>
): Promise<InvoiceDocument | null> => {
	if (!order.invoice) return null;
	const items = await loadItems(ctx, order._id);
	return {
		number: order.invoice.number,
		issuedAt: order.invoice.issuedAt,
		orderNumber: order.number,
		placedAt: order.placedAt,
		paymentMethod: order.paymentMethod,
		seller: order.invoice.seller,
		buyer: order.address,
		groups: groupBySet(items, (item) => ({
			title: item.title,
			variantLabel: item.variantLabel,
			hsn: item.hsn,
			gstRate: item.gstRate,
			unitPrice: item.unitPrice,
			quantity: item.quantity
		})),
		// The money that changed hands, as stored on the order
		subtotal: order.subtotal,
		shippingFee: order.shippingFee,
		total: order.total,
		taxByRate: order.invoice.taxByRate
	};
};

export const buildPackingSlipDocument = async (
	ctx: QueryCtx,
	order: Doc<'orders'>
): Promise<PackingSlipDocument> => {
	const [items, settings, shipment] = await Promise.all([
		loadItems(ctx, order._id),
		ctx.db.query('storeSettings').first(),
		ctx.db
			.query('shipments')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.first()
	]);
	return {
		orderNumber: order.number,
		placedAt: order.placedAt,
		paymentMethod: order.paymentMethod,
		zoneName: order.zoneName,
		deliveryMethod: order.deliveryMethod,
		seller: sellerFromSettings(settings),
		buyer: order.address,
		groups: groupBySet(items, (item) => ({
			title: item.title,
			variantLabel: item.variantLabel,
			quantity: item.quantity
		})),
		shipment: shipment ? { courier: shipment.courier, awb: shipment.awb } : undefined
	};
};
