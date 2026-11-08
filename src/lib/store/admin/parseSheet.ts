// Reads the billing software's stock sheet in the browser. Ported from the old store's importer
// (legacy/src/lib/products/import.ts), with one change: a blank cell is sent as missing, not 0,
// because a blank cell keeps the current value. Every decision about a row is made on the server
// (src/convex/model/store/importPlan.ts); this only lifts cells out of the sheet.
//
// The layout is fixed: row 8 is the header, data starts on row 9, a trailing "Total" row is
// dropped. Columns: MRP, barcode, tax category, purchase price, sale price, HSN, item details
// ("0901 Ganga Hindi": item code, then name), stock, unit.
import type { ImportRow } from '#convex/model/store/importPlan.js';

const FIRST_DATA_ROW = 8; // zero-based

const text = (cell: unknown) => {
	const value = cell === null || cell === undefined ? '' : String(cell).trim();
	return value || undefined;
};

/** Rupees to paise. Blank is missing; anything that isn't an amount is -1, which the server refuses. */
const paise = (cell: unknown) => {
	const value = text(cell);
	if (value === undefined) return undefined;
	const n = Number(value.replace(/,/g, ''));
	return Number.isFinite(n) ? Math.round(n * 100) : -1;
};

const count = (cell: unknown) => {
	const value = text(cell);
	if (value === undefined) return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : -1;
};

/** The item code is the number before the name ("0901 Ganga Hindi" → "0901"); the name is the rest. */
export const splitDetails = (details: string) => {
	const match = /^(\d+)\s+(.*)$/.exec(details.trim());
	return match
		? { code: match[1], name: match[2].trim() }
		: { code: undefined, name: details.trim() };
};

export const parseSheet = async (data: ArrayBuffer): Promise<ImportRow[]> => {
	const { read, utils } = await import('xlsx');
	const workbook = read(data, { type: 'array' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const raw: unknown[][] = utils.sheet_to_json(sheet, { header: 1, defval: null });
	const rows: ImportRow[] = [];
	raw.forEach((r, index) => {
		if (index < FIRST_DATA_ROW) return;
		const details = text(r[6]);
		if (!details || details === 'Total') return;
		const { code, name } = splitDetails(details);
		rows.push({
			line: index + 1,
			code,
			barcode: text(r[1]),
			name: name || undefined,
			mrp: paise(r[0]),
			price: paise(r[4]),
			purchasePrice: paise(r[3]),
			stock: count(r[7]),
			hsn: text(r[5]),
			tax: text(r[2])
		});
	});
	return rows;
};
