// src/lib/pdf/invoice.ts
import type { Content, TableCell } from 'pdfmake';
import type { OrderDocument } from '$convex/lib/orderDocument.js';
import { inr, formatDate } from './format.js';
import {
	addressLines,
	DEFAULT_STYLE,
	DOC_STYLES,
	type DocDefinition,
	itemsTableLayout,
	letterhead,
	metaTable,
	MUTED
} from './shared.js';

export function buildInvoiceDef(doc: OrderDocument): DocDefinition {
	const header: Content = {
		columns: [
			{ width: '*', stack: [letterhead()] },
			{
				width: 'auto',
				stack: [
					{ text: 'INVOICE', style: 'docTitle', alignment: 'right', margin: [0, 0, 0, 8] },
					metaTable([
						['Invoice Number', doc.orderRef],
						['Order Number', doc.orderRef],
						['Order Date', formatDate(doc.createdAt)],
						['Payment Method', doc.paymentMethod]
					])
				]
			}
		],
		columnGap: 24,
		margin: [0, 0, 0, 24]
	};

	const billTo: Content = {
		stack: [
			{ text: 'BILL TO', style: 'muted', fontSize: 9, margin: [0, 0, 0, 4] },
			...addressLines(doc).map((l, i) => ({ text: l, bold: i === 0 }))
		],
		margin: [0, 0, 0, 20]
	};

	const head: TableCell[] = [
		{ text: 'Sr.', style: 'th' },
		{ text: 'Product', style: 'th' },
		{ text: 'HSN', style: 'th' },
		{ text: 'GST %', style: 'th' },
		{ text: 'QTY', style: 'th' },
		{ text: 'Price', style: 'th', alignment: 'right' }
	];

	const body: TableCell[][] = doc.lines.map((l) => [
		{ text: String(l.sr) },
		{ text: l.name },
		{ text: l.hsnCode },
		{ text: l.gstLabel },
		{ text: String(l.quantity) },
		{ text: inr(l.lineTotal), alignment: 'right' }
	]);

	const itemsTable: Content = {
		table: {
			headerRows: 1,
			widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
			body: [head, ...body]
		},
		layout: itemsTableLayout
	};

	// Totals block, right-aligned. Subtotal / Shipping / Total, then the GST
	// inclusive breakdown line if any tax applies.
	const totalsBody: TableCell[][] = [
		[
			{ text: 'Subtotal', bold: true, border: [false, false, false, false] },
			{ text: inr(doc.totals.subtotal), alignment: 'right', border: [false, false, false, false] }
		],
		[
			{ text: 'Shipping', bold: true, border: [false, true, false, false] },
			{ text: inr(doc.totals.shipping), alignment: 'right', border: [false, true, false, false] }
		],
		[
			{ text: 'Total', bold: true, fontSize: 12, border: [false, true, false, false] },
			{
				text: inr(doc.totals.total),
				bold: true,
				fontSize: 12,
				alignment: 'right',
				border: [false, true, false, false]
			}
		]
	];

	if (doc.totals.taxBreakdown.length) {
		const parts = doc.totals.taxBreakdown.map((t) => `${inr(t.amount)} ${t.label}`).join(', ');
		totalsBody.push([
			{
				text: `(includes ${parts})`,
				colSpan: 2,
				fontSize: 8,
				color: MUTED,
				alignment: 'right',
				border: [false, false, false, false]
			},
			{}
		]);
	}

	const totals: Content = {
		columns: [
			{ width: '*', text: '' },
			{
				width: 'auto',
				table: { widths: ['auto', 'auto'], body: totalsBody },
				layout: {
					hLineWidth: (i: number) => (i === 1 || i === 2 ? 0.5 : 0),
					hLineColor: () => '#9ca3af',
					vLineWidth: () => 0,
					paddingTop: () => 4,
					paddingBottom: () => 4,
					paddingLeft: () => 12,
					paddingRight: () => 0
				}
			}
		],
		margin: [0, 14, 0, 0]
	};

	return {
		info: { title: `Invoice ${doc.orderRef}`, author: 'Aggarwalkart' },
		pageSize: 'A4',
		pageMargins: [40, 40, 40, 48],
		defaultStyle: DEFAULT_STYLE,
		styles: DOC_STYLES,
		content: [header, billTo, itemsTable, totals],
		footer: (currentPage: number, pageCount: number) => ({
			columns: [
				{ text: 'This is a computer-generated invoice.', style: 'muted', fontSize: 8 },
				{
					text: `Page ${currentPage} of ${pageCount}`,
					style: 'muted',
					fontSize: 8,
					alignment: 'right'
				}
			],
			margin: [40, 12, 40, 0]
		})
	};
}
