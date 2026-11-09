// Building blocks the invoice and the packing slip share: the letterhead, the address block and the
// look of the tables. Ported from legacy/src/lib/pdf/shared.ts. The letterhead reads the seller from
// the document, so no business detail lives in the repo (it is public). There is no logo until the
// shop's logo is dictated (store profile → To dictate).
import type { InvoiceDocument } from '#convex/store/validators.js';
import { strings } from '../strings.js';
import type { Content, CustomTableLayout, DocDefinition, Style } from './load.js';

const text = strings.documents;

export const DARK = '#111827';
export const MUTED = '#6b7280';
export const HAIRLINE = '#e5e7eb';
export const GROUP_FILL = '#f3f4f6';

export const DEFAULT_STYLE: Style = {
	font: 'Roboto',
	fontSize: 10,
	color: '#1f2937',
	lineHeight: 1.2
};

export const DOC_STYLES: Record<string, Style> = {
	docTitle: { fontSize: 22, bold: true },
	sellerName: { fontSize: 13, bold: true },
	muted: { color: MUTED },
	sectionLabel: { fontSize: 9, color: MUTED, margin: [0, 0, 0, 4] },
	th: { bold: true, color: '#ffffff', fontSize: 9.5 },
	group: { bold: true, fontSize: 9.5 }
};

export const pageSetup = (footer: DocDefinition['footer']) => ({
	pageSize: 'A4' as const,
	pageMargins: [40, 40, 40, 48] as [number, number, number, number],
	defaultStyle: DEFAULT_STYLE,
	styles: DOC_STYLES,
	footer
});

type Seller = InvoiceDocument['seller'];

/** The seller's name, address, GSTIN, phone and email, whichever the settings hold */
export const letterhead = (seller: Seller): Content[] => [
	{ text: seller.name, style: 'sellerName' },
	...(seller.address ?? '')
		.split('\n')
		.filter(Boolean)
		.map((line): Content => ({ text: line, style: 'muted', fontSize: 9 })),
	...(seller.gstin
		? [
				{
					text: text.gstNo(seller.gstin),
					style: 'muted',
					fontSize: 9,
					margin: [0, 4, 0, 0]
				} as Content
			]
		: []),
	...(seller.phone ? [{ text: text.phone(seller.phone), style: 'muted', fontSize: 9 }] : []),
	...(seller.email ? [{ text: seller.email, style: 'muted', fontSize: 9 }] : [])
];

type Buyer = InvoiceDocument['buyer'];

/** The customer's name and address, each part on its own line (used for "Bill to" and "Ship to") */
export const addressBlock = (buyer: Buyer, align?: 'right'): Content[] =>
	[
		{ text: buyer.name, bold: true },
		{ text: buyer.line1 },
		...(buyer.line2 ? [{ text: buyer.line2 }] : []),
		...(buyer.landmark ? [{ text: buyer.landmark }] : []),
		{ text: `${buyer.city}, ${buyer.state} ${buyer.pincode}` },
		{ text: text.phone(buyer.phone) }
	].map((line) => (align ? { ...line, alignment: align } : line));

/** A label and value per row, for the numbers and dates beside the title */
export const metaTable = (
	rows: [string, string][],
	margin: [number, number, number, number] = [0, 0, 0, 0]
): Content => ({
	table: {
		widths: ['auto', '*'],
		body: rows.map(([label, value]) => [{ text: label, style: 'muted' }, { text: value }])
	},
	layout: 'noBorders',
	margin
});

/** A dark header row, thin row separators and no vertical lines */
export const itemsTableLayout: CustomTableLayout = {
	fillColor: (row: number, node: { table: { body: unknown[][] } }) => {
		if (row === 0) return DARK;
		const first = node.table.body[row]?.[0] as { style?: string } | undefined;
		return first?.style === 'group' ? GROUP_FILL : null;
	},
	hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
	hLineColor: () => HAIRLINE,
	vLineWidth: () => 0,
	paddingTop: () => 6,
	paddingBottom: () => 6,
	paddingLeft: (i: number) => (i === 0 ? 8 : 4),
	paddingRight: () => 4
};

/** What the parent bought: the product, with its size when it has one */
export const productName = (title: string, variantLabel?: string) =>
	variantLabel ? `${title} (${variantLabel})` : title;

/** One group's heading row; a lone group with no label needs none */
export const showGroupHeadings = (groups: { label?: string }[]) =>
	groups.length > 1 || groups[0]?.label !== undefined;

export const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_-]+/g, '-');
