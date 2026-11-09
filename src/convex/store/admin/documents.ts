// The invoice and the packing slip for the shop's staff. Every function calls requireAppAdmin first.
// They return the data only; the PDF is drawn in the browser (src/lib/store/pdf).
import { ConvexError, v } from 'convex/values';
import { query } from '../../_generated/server.js';
import type { QueryCtx } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { buildInvoiceDocument, buildPackingSlipDocument } from '../../model/store/orderDocument.js';
import { invoiceDocument, packingSlipDocument } from '../validators.js';

/** Most slips printed in one go: the "to pack" column is bounded the same way */
const MAX_SLIPS = 50;

const loadOrder = async (ctx: QueryCtx, number: string) => {
	const order = await ctx.db
		.query('orders')
		.withIndex('by_number', (q) => q.eq('number', number))
		.unique();
	if (!order) throw new ConvexError('Order not found');
	return order;
};

/** Null until the order has shipped: the invoice is issued then, never before */
export const invoice = query({
	args: { number: v.string() },
	returns: v.union(v.null(), invoiceDocument),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		return await buildInvoiceDocument(ctx, await loadOrder(ctx, args.number));
	}
});

export const packingSlip = query({
	args: { number: v.string() },
	returns: packingSlipDocument,
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const order = await loadOrder(ctx, args.number);
		if (order.status === 'cancelled') throw new ConvexError('This order was cancelled');
		return await buildPackingSlipDocument(ctx, order);
	}
});

/** A slip for every order waiting to be packed, oldest first (paid online, and cash on delivery) */
export const packingSlipsToPack = query({
	args: {},
	returns: v.array(packingSlipDocument),
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const waiting = [];
		for (const status of ['paid', 'confirmed'] as const) {
			waiting.push(
				...(await ctx.db
					.query('orders')
					.withIndex('by_status_and_placedAt', (q) => q.eq('status', status))
					.take(MAX_SLIPS))
			);
		}
		waiting.sort((a, b) => a.placedAt - b.placedAt);
		return await Promise.all(
			waiting.slice(0, MAX_SLIPS).map((order) => buildPackingSlipDocument(ctx, order))
		);
	}
});
