// src/lib/products/types.ts

export type Category = 'book' | 'clothes' | 'stationary';

export type TaxCategory =
	| 'Exempt'
	| 'GST 5%'
	| 'GST 18%'
	| 'GST 0%'
	| 'GST 12 to 5%'
	| 'GST 12 to 0%'
	| 'GST 12 to 18%'
	| 'None';

export type Details =
	| { type: 'book'; author: string; subject: string }
	| { type: 'clothes'; gender: string; size: string; variant: 'sports' | 'white' }
	| { type: 'stationary'; itemType: string };

/** A spreadsheet row after parsing — the editable shape bound to the import table. */
export interface ParsedRow {
	/** Store's internal item code (the `0901` prefix on "Item Details"). The
	 * stable key we match existing products on when no real barcode is present. */
	code: string;
	name: string;
	salePrice: number;
	maxRetailPrice: number;
	purchasePrice: number;
	stock: number;
	category: Category;
	hsnCode: string;
	barcode: string;
	unit: string;
	taxCategory: TaxCategory | undefined;
	details: Details;
	valid: boolean;
	error?: string;
}

/** Payload shape accepted by the `dashboard.bulkUpsertProducts` Convex mutation. */
export interface ImportProduct {
	name: string;
	salePrice: number;
	maxRetailPrice?: number;
	purchasePrice?: number;
	stock: number;
	weight: number;
	category: Category;
	hsnCode?: string;
	barcode?: string;
	unit?: string;
	taxCategory?: TaxCategory;
	details: Details;
}

export interface ImportResult {
	created: number;
	updated: number;
	skipped: number;
}
