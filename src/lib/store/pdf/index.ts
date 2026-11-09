// What the buttons call. Each one draws a PDF and saves it; pdfmake loads on the first call only.
import type { InvoiceDocument, PackingSlipDocument } from '#convex/store/validators.js';
import { safeFileName } from './layout.js';
import { buildInvoice } from './invoice.js';
import { downloadPdf } from './load.js';
import { buildPackingSlips } from './packingSlip.js';

export const downloadInvoice = (doc: InvoiceDocument) =>
	downloadPdf(buildInvoice(doc), `invoice-${safeFileName(doc.number)}.pdf`);

export const downloadPackingSlip = (doc: PackingSlipDocument) =>
	downloadPdf(buildPackingSlips([doc]), `packing-slip-${safeFileName(doc.orderNumber)}.pdf`);

export const downloadPackingSlips = (docs: PackingSlipDocument[]) =>
	downloadPdf(buildPackingSlips(docs), 'packing-slips.pdf');
