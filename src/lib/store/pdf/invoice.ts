// The invoice, drawn from the data `store/orders.ts#invoiceDocument` (or the admin's) returns. All
// amounts, tax and numbers were decided on the server; this only lays them out.
// Ported from legacy/src/lib/pdf/invoice.ts.
import type { InvoiceDocument } from '#convex/store/validators.js';
import { formatDate, formatPrice } from '../format.js';
import { strings } from '../strings.js';
import {
	addressBlock,
	itemsTableLayout,
	letterhead,
	metaTable,
	MUTED,
	pageSetup,
	productName,
	showGroupHeadings
} from './layout.js';
import type { Content, DocDefinition, TableCell } from './load.js';

const text = strings.documents;
const COLUMNS = 7;

const rateLabel = (rate: InvoiceDocument['groups'][number]['lines'][number]['gstRate']) =>
	rate === 'exempt' ? text.exempt : `${rate / 100}%`;

export const buildInvoice = (doc: InvoiceDocument): DocDefinition => {
	const header: Content = {
		columns: [
			{ width: '*', stack: letterhead(doc.seller) },
			{
				width: 'auto',
				stack: [
					{ text: text.invoice.toUpperCase(), style: 'docTitle', alignment: 'right' },
					metaTable(
						[
							[text.invoiceNumber, doc.number],
							[text.invoiceDate, formatDate(doc.issuedAt)],
							[text.orderNumber, doc.orderNumber],
							[text.orderDate, formatDate(doc.placedAt)],
							[text.payment, doc.paymentMethod === 'cod' ? text.cod : text.online]
						],
						[0, 8, 0, 0]
					)
				]
			}
		],
		columnGap: 24,
		margin: [0, 0, 0, 24]
	};

	const billTo: Content = {
		stack: [{ text: text.billTo.toUpperCase(), style: 'sectionLabel' }, ...addressBlock(doc.buyer)],
		margin: [0, 0, 0, 20]
	};

	const head = [
		{ text: text.sr, style: 'th' },
		{ text: text.product, style: 'th' },
		{ text: text.hsn, style: 'th' },
		{ text: text.gst, style: 'th' },
		{ text: text.qty, style: 'th', alignment: 'right' },
		{ text: text.rate, style: 'th', alignment: 'right' },
		{ text: text.amount, style: 'th', alignment: 'right' }
	];
	const headings = showGroupHeadings(doc.groups);
	let sr = 0;
	const body = doc.groups.flatMap((group) => [
		...(headings
			? [
					[
						{ text: group.label ?? text.otherItems, style: 'group', colSpan: COLUMNS },
						...Array.from({ length: COLUMNS - 1 }, () => ({}))
					]
				]
			: []),
		...group.lines.map((line) => [
			{ text: String(++sr) },
			{ text: productName(line.title, line.variantLabel) },
			{ text: line.hsn },
			{ text: rateLabel(line.gstRate) },
			{ text: String(line.quantity), alignment: 'right' },
			{ text: formatPrice(line.unitPrice), alignment: 'right' },
			{ text: formatPrice(line.unitPrice * line.quantity), alignment: 'right' }
		])
	]);

	const none: [boolean, boolean, boolean, boolean] = [false, false, false, false];
	const rule: [boolean, boolean, boolean, boolean] = [false, true, false, false];
	const totalsBody: TableCell[][] = [
		[
			{ text: text.subtotal, bold: true, border: none },
			{ text: formatPrice(doc.subtotal), alignment: 'right', border: none }
		],
		[
			{ text: text.deliveryFee, bold: true, border: rule },
			{ text: formatPrice(doc.shippingFee), alignment: 'right', border: rule }
		],
		[
			{ text: text.total, bold: true, fontSize: 12, border: rule },
			{
				text: formatPrice(doc.total),
				bold: true,
				fontSize: 12,
				alignment: 'right',
				border: rule
			}
		]
	];
	// The tax already inside the prices, once per rate that carries any
	const taxed = doc.taxByRate.filter((row) => row.tax > 0);
	const includes = taxed.length
		? `${text.includes} ${taxed
				.map((row) => `${formatPrice(row.tax)} ${text.at(`${row.gstRate / 100}%`)}`)
				.join(', ')}`
		: '';

	const totals: Content = {
		columns: [
			{ width: '*', text: '' },
			{
				width: 'auto',
				stack: [
					{
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
					},
					...(includes
						? [
								{
									text: includes,
									fontSize: 8,
									color: MUTED,
									alignment: 'right',
									margin: [0, 6, 0, 0]
								} as Content
							]
						: [])
				]
			}
		],
		margin: [0, 14, 0, 0]
	};

	return {
		info: { title: `${text.invoice} ${doc.number}`, author: doc.seller.name },
		...pageSetup((page: number, pages: number) => ({
			columns: [
				{ text: text.computerMade, style: 'muted', fontSize: 8 },
				{ text: text.page(page, pages), style: 'muted', fontSize: 8, alignment: 'right' }
			],
			margin: [40, 12, 40, 0]
		})),
		content: [
			header,
			billTo,
			{
				table: {
					headerRows: 1,
					widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
					body: [head, ...body]
				},
				layout: itemsTableLayout
			},
			totals
		]
	} as DocDefinition;
};
