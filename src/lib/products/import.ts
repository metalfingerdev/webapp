// src/lib/products/import.ts
//
// Pure parsing, normalization and validation logic for the spreadsheet
// product importer. No Svelte / component state here — everything is a plain
// function so it can be unit-tested and reused.
import { read, utils } from 'xlsx';
import type { Category, Details, TaxCategory, ParsedRow, ImportProduct } from './types.js';

const TAX_CATEGORIES: TaxCategory[] = [
	'Exempt',
	'GST 5%',
	'GST 18%',
	'GST 0%',
	'GST 12 to 5%',
	'GST 12 to 0%',
	'GST 12 to 18%',
	'None'
];

export function inferCategory(hsn: string): Category {
	const h = String(hsn).trim();
	if (h.startsWith('4901') || h.startsWith('490110')) return 'book';
	return 'stationary';
}

export function makeDetails(category: Category): Details {
	if (category === 'book') return { type: 'book', author: '', subject: '' };
	if (category === 'clothes') return { type: 'clothes', gender: '', size: '', variant: 'white' };
	return { type: 'stationary', itemType: '' };
}

/** The store's item code is a numeric prefix on "Item Details" (e.g. "0901 Ganga
 * Hindi" → "0901"). It's the stable identifier we match products on, so unlike
 * `parseName` we keep it rather than strip it. Returns '' when absent. */
export function parseCode(raw: string): string {
	return (
		String(raw)
			.trim()
			.match(/^(\d+)\s+/)?.[1] ?? ''
	);
}

export function parseName(raw: string): string {
	// Trim first (like parseCode) so the two stay symmetric: whatever prefix
	// parseCode pulls out is exactly what parseName strips off.
	return String(raw)
		.trim()
		.replace(/^\d+\s+/, '');
}

/** Parse a rupee value into integer paise. Returns 0 for blanks/garbage. */
export function parsePrice(raw: unknown): number {
	if (raw == null) return 0;
	const n = parseFloat(String(raw).trim());
	return isNaN(n) ? 0 : Math.round(n * 100); // paise
}

export function normalizeTax(raw: unknown): TaxCategory | undefined {
	const s = String(raw ?? '').trim();
	if ((TAX_CATEGORIES as string[]).includes(s)) return s as TaxCategory;
	return undefined;
}

export function validate(row: ParsedRow): { valid: boolean; error?: string } {
	if (!row.name) return { valid: false, error: 'Missing name' };
	if (row.salePrice < 0) return { valid: false, error: 'Invalid price' };
	return { valid: true };
}

/**
 * Parse a raw workbook (.xlsx/.xls) ArrayBuffer into validated rows.
 * The sheet layout is fixed: row index 7 is the header, data starts at index
 * 8, and a trailing "Total" footer row is dropped.
 */
export function parseWorkbook(data: ArrayBuffer): ParsedRow[] {
	const wb = read(data, { type: 'array' });
	const ws = wb.Sheets[wb.SheetNames[0]];
	const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1, defval: null });

	const dataRows = raw.slice(8).filter((r) => r[6] != null && String(r[6]).trim() !== 'Total');

	return dataRows.map((r): ParsedRow => {
		const hsnCode = String(r[5] ?? '');
		const category = inferCategory(hsnCode);
		const itemDetails = String(r[6] ?? '');
		const row: ParsedRow = {
			code: parseCode(itemDetails),
			name: parseName(itemDetails),
			salePrice: parsePrice(r[4]),
			maxRetailPrice: parsePrice(r[0]),
			purchasePrice: parsePrice(r[3]),
			stock: typeof r[7] === 'number' ? r[7] : parseInt(String(r[7] ?? '0')) || 0,
			category,
			hsnCode,
			barcode: String(r[1] ?? '').trim(),
			unit: String(r[8] ?? 'Pcs.').trim(),
			taxCategory: normalizeTax(r[2]),
			details: makeDetails(category),
			valid: false
		};
		const { valid, error } = validate(row);
		row.valid = valid;
		row.error = error;
		return row;
	});
}

/** Map the valid rows into the payload accepted by `dashboard.bulkUpsertProducts`.
 * Only a real barcode is sent; the server matches by name when it's absent. */
export function buildImportPayload(rows: ParsedRow[]): ImportProduct[] {
	return rows
		.filter((r) => r.valid)
		.map((r) => ({
			name: r.name,
			salePrice: r.salePrice,
			maxRetailPrice: r.maxRetailPrice || undefined,
			purchasePrice: r.purchasePrice || undefined,
			stock: r.stock,
			weight: 0,
			category: r.category,
			hsnCode: r.hsnCode || undefined,
			barcode: r.barcode || undefined,
			unit: r.unit || undefined,
			taxCategory: r.taxCategory || undefined,
			details: r.details
		}));
}
