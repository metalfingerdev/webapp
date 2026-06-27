// src/lib/pdf/shared.ts
//
// Building blocks shared by the invoice and packing-slip definitions: the
// letterhead, the dark-header item table styling, and the address block.
import type { Content, CustomTableLayout, Style } from 'pdfmake';
import faviconSvg from '$lib/assets/favicon.svg?raw';
import { SELLER } from './seller.js';
import type { OrderDocument } from '$convex/lib/orderDocument.js';

// pdfmake's main entry re-exports most interface types but not
// TDocumentDefinitions; derive it from createPdf's signature so we stay on the
// resolvable main specifier (see src/pdfmake-modules.d.ts for the why).
type PdfMakeModule = typeof import('pdfmake');
export type DocDefinition = Parameters<PdfMakeModule['createPdf']>[0];

// TODO: swap favicon.svg for the real Aggarwalkart logo when available — just
// point this import at the new asset.
export const LOGO_SVG = faviconSvg;

export const BRAND_DARK = '#111827';
export const MUTED = '#6b7280';
export const HAIRLINE = '#e5e7eb';

export const DEFAULT_STYLE: Style = { font: 'Roboto', fontSize: 10, color: '#1f2937', lineHeight: 1.2 };

export const DOC_STYLES: Record<string, Style> = {
	docTitle: { fontSize: 22, bold: true },
	sellerName: { fontSize: 12, bold: true },
	muted: { color: MUTED },
	sectionLabel: { fontSize: 11, bold: true, margin: [0, 0, 0, 4] },
	th: { bold: true, color: '#ffffff', fontSize: 9.5 }
};

/** Logo + seller name/address/GSTIN — the top-left letterhead on every page. */
export function letterhead(): Content {
	return {
		columns: [
			{ width: 46, svg: LOGO_SVG, fit: [46, 46] },
			{
				width: '*',
				stack: [
					{ text: SELLER.name, style: 'sellerName' },
					...SELLER.addressLines.map((l) => ({ text: l, style: 'muted', fontSize: 9 })),
					{ text: `GST No. ${SELLER.gstin}`, style: 'muted', fontSize: 9, margin: [0, 4, 0, 0] }
				],
				margin: [10, 2, 0, 0]
			}
		],
		columnGap: 0
	};
}

/** Recipient address lines (used for both "Bill To" and "Ship To"). */
export function addressLines(doc: OrderDocument): string[] {
	const out: string[] = [];
	if (doc.customer?.name) out.push(doc.customer.name);
	if (doc.address) {
		const a = doc.address;
		out.push(a.street, `${a.city}, ${a.state} ${a.pincode}`);
	}
	if (doc.customer?.email) out.push(doc.customer.email);
	if (!out.length) out.push('—');
	return out;
}

/** A label/value meta block, e.g. "Order Number:  2826" rows. */
export function metaTable(rows: [string, string][]): Content {
	return {
		table: {
			widths: ['auto', '*'],
			body: rows.map(([k, v]) => [
				{ text: k, style: 'muted' },
				{ text: v, bold: false }
			])
		},
		layout: 'noBorders'
	};
}

/** Clean table look: dark header row, thin row separators, no vertical lines. */
export const itemsTableLayout: CustomTableLayout = {
	fillColor: (rowIndex: number) => (rowIndex === 0 ? BRAND_DARK : null),
	hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
	hLineColor: () => HAIRLINE,
	vLineWidth: () => 0,
	paddingTop: () => 6,
	paddingBottom: () => 6,
	paddingLeft: (i: number) => (i === 0 ? 8 : 4),
	paddingRight: () => 4
};
