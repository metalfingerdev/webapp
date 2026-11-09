// Fetch a document's data from Convex, then draw and save its PDF. The drawing code (and pdfmake)
// is imported only here, when a button is tapped, so no page carries it.
import type { ConvexClient } from 'convex/browser';
import { api } from '#convex/_generated/api.js';

const pdf = () => import('./pdf/index.js');

/** The customer's own invoice. Throws while the order has not shipped (no invoice exists yet). */
export const saveMyInvoice = async (client: ConvexClient, number: string) => {
	const doc = await client.query(api.store.orders.invoiceDocument, { number });
	if (!doc) throw new Error('No invoice yet');
	await (await pdf()).downloadInvoice(doc);
};

export const saveInvoice = async (client: ConvexClient, number: string) => {
	const doc = await client.query(api.store.admin.documents.invoice, { number });
	if (!doc) throw new Error('No invoice yet');
	await (await pdf()).downloadInvoice(doc);
};

export const savePackingSlip = async (client: ConvexClient, number: string) => {
	const doc = await client.query(api.store.admin.documents.packingSlip, { number });
	await (await pdf()).downloadPackingSlip(doc);
};

/** One PDF with a slip for every order waiting to be packed */
export const savePackingSlips = async (client: ConvexClient) => {
	const docs = await client.query(api.store.admin.documents.packingSlipsToPack, {});
	if (docs.length === 0) throw new Error('Nothing to pack');
	await (await pdf()).downloadPackingSlips(docs);
};
