import { describe, it, expect } from 'vitest';
import { utils, write } from 'xlsx';
import {
	inferCategory,
	makeDetails,
	parseCode,
	parseName,
	parsePrice,
	normalizeTax,
	validate,
	parseWorkbook,
	buildImportPayload
} from './import.js';
import type { ParsedRow } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A valid baseline row; spread overrides on top for each case. */
function makeRow(overrides: Partial<ParsedRow> = {}): ParsedRow {
	return {
		code: '0901',
		name: 'Ganga Hindi',
		salePrice: 11500,
		maxRetailPrice: 11500,
		purchasePrice: 11500,
		stock: 10,
		category: 'book',
		hsnCode: '4901',
		barcode: '',
		unit: 'Pcs.',
		taxCategory: 'Exempt',
		details: { type: 'book', author: '', subject: '' },
		valid: true,
		...overrides
	};
}

/** Build a .xlsx ArrayBuffer mirroring the real export layout: 7 preamble rows,
 * a header at index 7, data from index 8, and a trailing "Total" footer. */
function makeWorkbook(dataRows: unknown[][]): ArrayBuffer {
	const aoa: unknown[][] = [
		['Aggarwal Book & Stationery Mart'],
		['Some Address'],
		['9818453672'],
		['Stock Status'],
		['As On : 30-05-2026'],
		['All Items'],
		[],
		[
			'MRP',
			'Alias',
			'Tax Category',
			'Pur Price',
			'Sale Price',
			'Hsn',
			'Item Details',
			'Qty.',
			'Unit'
		],
		...dataRows,
		[null, null, null, null, null, null, 'Total', 808151.11, null]
	];
	const ws = utils.aoa_to_sheet(aoa);
	const wb = utils.book_new();
	utils.book_append_sheet(wb, ws, 'Sheet1');
	return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

// ---------------------------------------------------------------------------
// parseCode — the match key
// ---------------------------------------------------------------------------

describe('parseCode', () => {
	it('extracts the leading numeric item code', () => {
		expect(parseCode('0901 Ganga Hindi')).toBe('0901');
		expect(parseCode('0158 Itc Spiral Note Book 24x18')).toBe('0158');
	});

	it('preserves leading zeros (it is a string, not a number)', () => {
		expect(parseCode('0007 Something')).toBe('0007');
	});

	it('returns "" when there is no code prefix', () => {
		expect(parseCode('No Code Item')).toBe('');
		expect(parseCode('')).toBe('');
	});

	it('does not treat digits embedded in the name as a code', () => {
		// "24x18" is part of the name, not a leading code.
		expect(parseCode('Note Book 24x18')).toBe('');
	});
});

// ---------------------------------------------------------------------------
// parseName — strips the code that parseCode keeps
// ---------------------------------------------------------------------------

describe('parseName', () => {
	it('drops the leading code and trims', () => {
		expect(parseName('0901 Ganga Hindi')).toBe('Ganga Hindi');
		expect(parseName('  0158   Itc Spiral  ')).toBe('Itc Spiral');
	});

	it('leaves a code-less name intact', () => {
		expect(parseName('No Code Item')).toBe('No Code Item');
	});
});

// ---------------------------------------------------------------------------
// parsePrice — rupees → integer paise
// ---------------------------------------------------------------------------

describe('parsePrice', () => {
	it('converts rupees to paise', () => {
		expect(parsePrice('115.00')).toBe(11500);
		expect(parsePrice('55.5')).toBe(5550);
	});

	it('handles the whitespace-padded strings the export produces', () => {
		expect(parsePrice('                65.00')).toBe(6500);
	});

	it('returns 0 for blanks and garbage', () => {
		expect(parsePrice(null)).toBe(0);
		expect(parsePrice(undefined)).toBe(0);
		expect(parsePrice('')).toBe(0);
		expect(parsePrice('abc')).toBe(0);
	});

	it('rounds to the nearest paise', () => {
		expect(parsePrice('10.999')).toBe(1100);
	});
});

// ---------------------------------------------------------------------------
// normalizeTax
// ---------------------------------------------------------------------------

describe('normalizeTax', () => {
	it('passes through known tax categories', () => {
		expect(normalizeTax('Exempt')).toBe('Exempt');
		expect(normalizeTax('GST 18%')).toBe('GST 18%');
	});

	it('returns undefined for unknown / empty values', () => {
		expect(normalizeTax(null)).toBeUndefined();
		expect(normalizeTax('')).toBeUndefined();
		expect(normalizeTax('GST 99%')).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// inferCategory / makeDetails
// ---------------------------------------------------------------------------

describe('inferCategory', () => {
	it('treats 4901* HSN codes as books', () => {
		expect(inferCategory('4901')).toBe('book');
		expect(inferCategory('490110')).toBe('book');
	});

	it('defaults everything else to stationary', () => {
		expect(inferCategory('48202000')).toBe('stationary');
		expect(inferCategory('')).toBe('stationary');
	});
});

describe('makeDetails', () => {
	it('builds an empty details object for the category', () => {
		expect(makeDetails('book')).toEqual({ type: 'book', author: '', subject: '' });
		expect(makeDetails('clothes')).toEqual({
			type: 'clothes',
			gender: '',
			size: '',
			variant: 'white'
		});
		expect(makeDetails('stationary')).toEqual({ type: 'stationary', itemType: '' });
	});
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

describe('validate', () => {
	it('accepts a well-formed row', () => {
		expect(validate(makeRow())).toEqual({ valid: true });
	});

	it('rejects a missing name', () => {
		expect(validate(makeRow({ name: '' }))).toEqual({ valid: false, error: 'Missing name' });
	});

	it('rejects a negative sale price', () => {
		expect(validate(makeRow({ salePrice: -1 }))).toEqual({ valid: false, error: 'Invalid price' });
	});

	it('allows negative stock (real exports have it) as long as price/name are ok', () => {
		expect(validate(makeRow({ stock: -20 }))).toEqual({ valid: true });
	});
});

// ---------------------------------------------------------------------------
// parseWorkbook — full round-trip through the fixed sheet layout
// ---------------------------------------------------------------------------

describe('parseWorkbook', () => {
	const buf = makeWorkbook([
		['  115.00', null, 'Exempt', '115.00', '115.00', '4901', '0901 Ganga Hindi', -20, 'Pcs.'],
		['  65.00', null, null, '65.00', '55.00', '48202000', '0158 Itc Spiral Note Book', 835, 'Pcs.'],
		['  200.00', '8901234567890', 'GST 18%', '180.00', '200.00', '', 'No Code Item', 5, 'Pkt']
	]);
	const rows = parseWorkbook(buf);

	it('drops the preamble and the Total footer, keeping only data rows', () => {
		expect(rows).toHaveLength(3);
		expect(rows.some((r) => r.name === 'Total')).toBe(false);
	});

	it('splits the item code out of the name and infers book category from HSN', () => {
		const book = rows[0];
		expect(book.code).toBe('0901');
		expect(book.name).toBe('Ganga Hindi');
		expect(book.category).toBe('book');
		expect(book.salePrice).toBe(11500);
		expect(book.maxRetailPrice).toBe(11500);
		expect(book.taxCategory).toBe('Exempt');
		expect(book.stock).toBe(-20); // negative stock preserved
		expect(book.valid).toBe(true);
	});

	it('leaves tax undefined when the cell is blank and defaults non-book HSN to stationary', () => {
		const stationary = rows[1];
		expect(stationary.code).toBe('0158');
		expect(stationary.category).toBe('stationary');
		expect(stationary.taxCategory).toBeUndefined();
		expect(stationary.stock).toBe(835);
	});

	it('keeps a real barcode and yields an empty code when there is no prefix', () => {
		const noCode = rows[2];
		expect(noCode.code).toBe('');
		expect(noCode.barcode).toBe('8901234567890');
		expect(noCode.hsnCode).toBe('');
		expect(noCode.unit).toBe('Pkt');
	});
});

// ---------------------------------------------------------------------------
// buildImportPayload — match-key selection + valid-only filtering
// ---------------------------------------------------------------------------

describe('buildImportPayload', () => {
	it('only includes valid rows', () => {
		const payload = buildImportPayload([
			makeRow({ name: 'Keep' }),
			makeRow({ name: 'Drop', valid: false })
		]);
		expect(payload).toHaveLength(1);
		expect(payload[0].name).toBe('Keep');
	});

	it('sends a real barcode through as-is', () => {
		const [p] = buildImportPayload([makeRow({ barcode: '8901234567890' })]);
		expect(p.barcode).toBe('8901234567890');
	});

	it('does NOT use the item code as a barcode — the server matches by name instead', () => {
		const [p] = buildImportPayload([makeRow({ barcode: '', code: '0901' })]);
		expect(p.barcode).toBeUndefined();
	});

	it('drops zero-valued optional prices to undefined and always sets weight 0', () => {
		const [p] = buildImportPayload([makeRow({ maxRetailPrice: 0, purchasePrice: 0 })]);
		expect(p.maxRetailPrice).toBeUndefined();
		expect(p.purchasePrice).toBeUndefined();
		expect(p.weight).toBe(0);
	});
});
