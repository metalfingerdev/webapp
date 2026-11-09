// The packing slip: what to pack and where it goes. It has no prices, because it travels with the
// parcel and the delivery person (the data has no price field to print). One slip, or many in one
// PDF with a page break between them. Ported from legacy/src/lib/pdf/packing-slip.ts.
import type { PackingSlipDocument } from '#convex/store/validators.js';
import { formatDate } from '../format.js';
import { strings } from '../strings.js';
import {
	addressBlock,
	itemsTableLayout,
	letterhead,
	metaTable,
	pageSetup,
	productName,
	showGroupHeadings
} from './layout.js';
import type { Content, DocDefinition } from './load.js';

const text = strings.documents;
const COLUMNS = 3;

const slipContent = (doc: PackingSlipDocument): Content[] => {
	const header: Content = {
		columns: [
			{ width: '*', stack: letterhead(doc.seller) },
			{
				width: 'auto',
				stack: [
					{ text: text.shipTo.toUpperCase(), style: 'docTitle', fontSize: 18, alignment: 'right' },
					...addressBlock(doc.buyer, 'right')
				]
			}
		],
		columnGap: 24,
		margin: [0, 0, 0, 20]
	};

	const meta: Content = {
		stack: [
			{ text: text.packingSlip.toUpperCase(), style: 'sectionLabel' },
			metaTable([
				[text.orderNumber, doc.orderNumber],
				[text.orderDate, formatDate(doc.placedAt)],
				[
					text.delivery,
					doc.shipment ? text.deliveredBy(doc.shipment.courier, doc.shipment.awb) : doc.zoneName
				],
				[text.payment, doc.paymentMethod === 'cod' ? text.cod : text.online]
			])
		],
		margin: [0, 0, 0, 18]
	};

	const head = [
		{ text: text.sr, style: 'th' },
		{ text: text.product, style: 'th' },
		{ text: text.qty, style: 'th', alignment: 'right' }
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
			{ text: String(line.quantity), alignment: 'right' }
		])
	]);

	return [
		header,
		meta,
		{
			table: { headerRows: 1, widths: ['auto', '*', 'auto'], body: [head, ...body] },
			layout: itemsTableLayout
		}
	] as Content[];
};

export const buildPackingSlips = (docs: PackingSlipDocument[]): DocDefinition => {
	const content: Content[] = [];
	docs.forEach((doc, i) => {
		const slip = slipContent(doc);
		// Each slip starts a new page
		if (i > 0) slip[0] = { ...(slip[0] as object), pageBreak: 'before' } as Content;
		content.push(...slip);
	});
	return {
		info: {
			title: docs.length === 1 ? `${text.packingSlip} ${docs[0].orderNumber}` : text.packingSlip,
			author: docs[0]?.seller.name
		},
		...pageSetup((page: number, pages: number) => ({
			text: text.page(page, pages),
			style: 'muted',
			fontSize: 8,
			alignment: 'right',
			margin: [40, 12, 40, 0]
		})),
		content
	} as DocDefinition;
};
