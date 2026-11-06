// src/lib/pdf/index.ts
//
// Public API for document generation. Components should use these helpers rather
// than touching pdfmake directly.
import type { OrderDocument } from '$convex/lib/orderDocument.js';
import { buildInvoiceDef } from './invoice.js';
import { buildPackingSlipDef, buildPackingSlipsDef } from './packing-slip.js';
import { downloadPdf, printPdf, openPdf } from './pdf-core.js';
import { safeRef } from './format.js';

export type { OrderDocument };

export const downloadInvoice = (doc: OrderDocument) =>
	downloadPdf(buildInvoiceDef(doc), `invoice-${safeRef(doc.orderRef)}.pdf`);

export const printInvoice = (doc: OrderDocument) => printPdf(buildInvoiceDef(doc));

export const openInvoice = (doc: OrderDocument) => openPdf(buildInvoiceDef(doc));

export const downloadPackingSlip = (doc: OrderDocument) =>
	downloadPdf(buildPackingSlipDef(doc), `packing-slip-${safeRef(doc.orderRef)}.pdf`);

export const printPackingSlip = (doc: OrderDocument) => printPdf(buildPackingSlipDef(doc));

/** One combined PDF of many packing slips — the dashboard's "print the day" action. */
export const downloadPackingSlips = (docs: OrderDocument[], filename = 'packing-slips.pdf') =>
	downloadPdf(buildPackingSlipsDef(docs), filename);

export { buildInvoiceDef, buildPackingSlipDef, buildPackingSlipsDef };
