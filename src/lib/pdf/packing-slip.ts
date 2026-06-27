// src/lib/pdf/packing-slip.ts
import type { Content, TableCell } from 'pdfmake';
import type { OrderDocument } from '$convex/lib/orderDocument.js';
import { formatDate } from './format.js';
import {
	addressLines,
	DEFAULT_STYLE,
	DOC_STYLES,
	type DocDefinition,
	itemsTableLayout,
	letterhead,
	metaTable
} from './shared.js';

// Deliberately price-free: this goes to the delivery person, so it shows what to
// pack and where to send it — never amounts.
function packingContent(doc: OrderDocument): Content[] {
	const header: Content = {
		columns: [
			{ width: '*', stack: [letterhead()] },
			{
				width: 'auto',
				stack: [
					{ text: 'SHIP TO:', style: 'docTitle', fontSize: 18, alignment: 'right', margin: [0, 0, 0, 6] },
					...addressLines(doc).map((l, i) => ({ text: l, bold: i === 0, alignment: 'right' as const }))
				]
			}
		],
		columnGap: 24,
		margin: [0, 0, 0, 20]
	};

	const meta: Content = {
		stack: [
			{ text: 'PACKING SLIP', style: 'sectionLabel' },
			metaTable([
				['Order Number', doc.orderRef],
				['Order Date', formatDate(doc.createdAt)],
				['Shipping Method', doc.shippingMethod]
			])
		],
		margin: [0, 0, 0, 18]
	};

	const head: TableCell[] = [
		{ text: 'Sr.', style: 'th' },
		{ text: 'Product', style: 'th' },
		{ text: 'QTY', style: 'th', alignment: 'right' }
	];
	const body: TableCell[][] = doc.lines.map((l) => [
		{ text: String(l.sr) },
		{ text: l.name },
		{ text: String(l.quantity), alignment: 'right' }
	]);

	const itemsTable: Content = {
		table: { headerRows: 1, widths: ['auto', '*', 'auto'], body: [head, ...body] },
		layout: itemsTableLayout
	};

	const out: Content[] = [header, meta, itemsTable];

	if (doc.notes) {
		out.push({
			stack: [
				{ text: 'Customer Notes', style: 'sectionLabel', margin: [0, 16, 0, 4] },
				{ text: doc.notes }
			]
		});
	}
	return out;
}

export function buildPackingSlipDef(doc: OrderDocument): DocDefinition {
	return {
		info: { title: `Packing Slip ${doc.orderRef}`, author: 'Aggarwalkart' },
		pageSize: 'A4',
		pageMargins: [40, 40, 40, 48],
		defaultStyle: DEFAULT_STYLE,
		styles: DOC_STYLES,
		content: packingContent(doc),
		footer: (currentPage: number, pageCount: number) => ({
			text: `Page ${currentPage} of ${pageCount}`,
			style: 'muted',
			fontSize: 8,
			alignment: 'right',
			margin: [40, 12, 40, 0]
		})
	};
}

// Batch: one PDF containing every order's packing slip, page-broken between
// them — for "print the day's slips" from the dashboard.
export function buildPackingSlipsDef(docs: OrderDocument[]): DocDefinition {
	const content: Content[] = [];
	docs.forEach((doc, i) => {
		const slip = packingContent(doc);
		if (i > 0 && slip[0] && typeof slip[0] === 'object') {
			(slip[0] as { pageBreak?: string }).pageBreak = 'before';
		}
		content.push(...slip);
	});

	return {
		info: { title: 'Packing Slips', author: 'Aggarwalkart' },
		pageSize: 'A4',
		pageMargins: [40, 40, 40, 48],
		defaultStyle: DEFAULT_STYLE,
		styles: DOC_STYLES,
		content,
		footer: (currentPage: number, pageCount: number) => ({
			text: `Page ${currentPage} of ${pageCount}`,
			style: 'muted',
			fontSize: 8,
			alignment: 'right',
			margin: [40, 12, 40, 0]
		})
	};
}
