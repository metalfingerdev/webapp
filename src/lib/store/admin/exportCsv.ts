import type { ConvexClient } from 'convex/browser';
import { api } from '#convex/_generated/api.js';
import { toRupeeInput } from './money.js';

const cell = (value: string | number | boolean | null) => {
	const text = value === null ? '' : String(value);
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Every size of every product as a CSV file, walked page by page, then downloaded. */
export const exportCatalogue = async (client: ConvexClient) => {
	const lines = [
		[
			'Item code',
			'Title',
			'Size',
			'Category',
			'Type',
			'ISBN',
			'HSN',
			'GST',
			'MRP',
			'Price',
			'Purchase price',
			'Stock',
			'On sale'
		].join(',')
	];
	let cursor: string | null = null;
	for (;;) {
		const page: Awaited<
			ReturnType<typeof client.query<typeof api.store.admin.products.exportPage>>
		> = await client.query(api.store.admin.products.exportPage, { cursor });
		for (const row of page.rows) {
			lines.push(
				[
					row.sku,
					row.title,
					row.size,
					row.category,
					row.kind,
					row.isbn,
					row.hsn,
					row.gstRate === 'exempt' ? 'Exempt' : `${row.gstRate / 100}%`,
					toRupeeInput(row.mrp),
					toRupeeInput(row.price),
					toRupeeInput(row.purchasePrice),
					row.stock,
					row.active ? 'yes' : 'no'
				]
					.map(cell)
					.join(',')
			);
		}
		if (page.isDone) break;
		cursor = page.cursor;
	}
	const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
	link.click();
	URL.revokeObjectURL(link.href);
};
