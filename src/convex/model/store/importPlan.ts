// The stock-sheet import (admin.md → Import). One planner feeds both the preview and the apply,
// so what the admin approved is exactly what is written. The sheet is read in the browser
// (src/lib/store/admin/parseSheet.ts); rows arrive here as cells, and every decision is made here.
import { ConvexError, v, type Infer } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel.js';
import type { MutationCtx, QueryCtx } from '../../_generated/server.js';
import type { GstRate } from '../../store/validators.js';
import { buildSearchText } from './catalog.js';
import { isHsn, MAX_TITLE_LENGTH, priceError, uniqueProductSlug } from './products.js';
import { adjustStock, heldByOpenOrders } from './stock.js';

/** Rows one import may carry; a bigger sheet is split. Keeps one apply inside Convex's limits. */
export const MAX_IMPORT_ROWS = 500;

/** The "low stock" level a product created by import starts with; the admin changes it per size. */
export const IMPORT_LOW_STOCK_AT = 2;

/** One sheet row. A missing value is a blank cell, and a blank cell keeps what is there. */
export const importRow = v.object({
	line: v.number(), // the sheet's row number, for messages
	code: v.optional(v.string()),
	barcode: v.optional(v.string()),
	name: v.optional(v.string()),
	mrp: v.optional(v.number()), // paise
	price: v.optional(v.number()), // paise
	purchasePrice: v.optional(v.number()), // paise
	stock: v.optional(v.number()),
	hsn: v.optional(v.string()),
	tax: v.optional(v.string()) // the sheet's tax category text, e.g. "GST 5%"
});
export type ImportRow = Infer<typeof importRow>;

/** What the stock column means: ignored (default), added as goods received, or a shelf count. */
export const stockMode = v.union(v.literal('keep'), v.literal('add'), v.literal('set'));
export type StockMode = Infer<typeof stockMode>;

export const importOptions = v.object({
	stockMode,
	/** Where rows that match no product are created. Without it, new rows are errors. */
	newCategoryId: v.optional(v.id('categories'))
});
export type ImportOptions = Infer<typeof importOptions>;

export type PlannedRow = {
	line: number;
	sku: string;
	title: string;
	status: 'new' | 'update' | 'unchanged' | 'error';
	/** Fields that change, as "price ₹120 → ₹110" style pairs (values in paise or text). */
	changes: { field: string; from: string | number | null; to: string | number }[];
	stockDelta: number;
	error?: string;
};

type Write = {
	row: PlannedRow;
	variant?: Doc<'productVariants'>;
	product?: Doc<'products'>;
	productPatch: Partial<Doc<'products'>>;
	variantPatch: Partial<Doc<'productVariants'>>;
	create?: {
		title: string;
		hsn: string;
		gstRate: GstRate;
		mrp: number;
		price: number;
		purchasePrice?: number;
	};
};

/**
 * The sheet's tax text as a rate. Only a text naming exactly one rate converts: a combined
 * category such as "GST 12 to 5%" is an error, because choosing the rate is the CA's call, not
 * the importer's. Blank or "None" keeps the product's rate.
 */
export const parseTax = (text: string | undefined): GstRate | undefined | 'unclear' => {
	const value = text?.trim().toLowerCase() ?? '';
	if (value === '' || value === 'none') return undefined;
	if (value === 'exempt') return 'exempt';
	const match = /^gst\s*(\d+)\s*%$/.exec(value);
	const rates: Record<string, GstRate> = { '0': 0, '5': 500, '12': 1200, '18': 1800, '28': 2800 };
	return match ? (rates[match[1]] ?? 'unclear') : 'unclear';
};

const blankPrice = (value: number | undefined) =>
	value === undefined || value === 0 ? undefined : value;

const planRow = async (
	ctx: QueryCtx,
	row: ImportRow,
	options: ImportOptions,
	seen: Map<string, number>
): Promise<Write> => {
	const sku = row.code?.trim() || row.barcode?.trim() || '';
	const name = row.name?.trim() ?? '';
	const planned: PlannedRow = {
		line: row.line,
		sku,
		title: name,
		status: 'error',
		changes: [],
		stockDelta: 0
	};
	const fail = (error: string): Write => ({
		row: { ...planned, error },
		productPatch: {},
		variantPatch: {}
	});

	if (!sku) return fail('No item code or barcode, so it cannot be matched');
	const earlier = seen.get(sku);
	if (earlier !== undefined) return fail(`Item code ${sku} is also on row ${earlier}`);
	seen.set(sku, row.line);
	if (name.length > MAX_TITLE_LENGTH) return fail('The name is too long');

	const tax = parseTax(row.tax);
	if (tax === 'unclear') return fail(`Tax "${row.tax}" is not one rate; set the rate on the sheet`);
	const hsn = row.hsn?.trim() || undefined;
	if (hsn && !isHsn(hsn)) return fail(`HSN "${hsn}" is not 4, 6 or 8 digits`);
	for (const value of [row.mrp, row.price, row.purchasePrice]) {
		if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
			return fail('A price is not a valid amount');
		}
	}
	if (row.stock !== undefined && (!Number.isInteger(row.stock) || row.stock < 0)) {
		return fail('Stock is not a whole number, zero or more');
	}

	const matches = await ctx.db
		.query('productVariants')
		.withIndex('by_sku', (q) => q.eq('sku', sku))
		.take(2);
	if (matches.length > 1) return fail(`Two products share item code ${sku}; fix them first`);
	const variant = matches[0];

	if (!variant) {
		const price = blankPrice(row.price);
		const missing = [
			!name && 'name',
			!price && 'price',
			!hsn && 'HSN',
			tax === undefined && 'tax rate',
			!options.newCategoryId && 'a category for new products'
		].filter(Boolean);
		if (missing.length) return fail(`New product needs ${missing.join(', ')}`);
		const mrp = blankPrice(row.mrp) ?? price!;
		const error = priceError(price!, mrp);
		if (error) return fail(error);
		const stockDelta = options.stockMode !== 'keep' ? (row.stock ?? 0) : 0;
		return {
			row: { ...planned, status: 'new', stockDelta },
			productPatch: {},
			variantPatch: {},
			create: {
				title: name,
				hsn: hsn!,
				gstRate: tax!,
				mrp,
				price: price!,
				purchasePrice: blankPrice(row.purchasePrice)
			}
		};
	}

	const product = await ctx.db.get('products', variant.productId);
	if (!product) return fail('The matched product is missing');
	planned.title = product.title;
	const changes: PlannedRow['changes'] = [];
	const productPatch: Partial<Doc<'products'>> = {};
	const variantPatch: Partial<Doc<'productVariants'>> = {};

	// A uniform's name, HSN and rate belong to the whole item, not to one size's row.
	if (product.kind !== 'uniform') {
		if (name && name !== product.title) {
			changes.push({ field: 'title', from: product.title, to: name });
			productPatch.title = name;
			productPatch.searchText = buildSearchText({ ...product, title: name });
			planned.title = name;
		}
		if (hsn && hsn !== product.hsn) {
			changes.push({ field: 'hsn', from: product.hsn, to: hsn });
			productPatch.hsn = hsn;
		}
		if (tax !== undefined && tax !== product.gstRate) {
			changes.push({ field: 'gstRate', from: product.gstRate, to: tax });
			productPatch.gstRate = tax;
		}
	}
	const price = blankPrice(row.price) ?? variant.price;
	const mrp = blankPrice(row.mrp) ?? variant.mrp;
	const error = priceError(price, mrp);
	if (error) return fail(error);
	if (price !== variant.price) {
		changes.push({ field: 'price', from: variant.price, to: price });
		variantPatch.price = price;
	}
	if (mrp !== variant.mrp) {
		changes.push({ field: 'mrp', from: variant.mrp, to: mrp });
		variantPatch.mrp = mrp;
	}
	const purchasePrice = blankPrice(row.purchasePrice);
	if (purchasePrice !== undefined && purchasePrice !== variant.purchasePrice) {
		changes.push({
			field: 'purchasePrice',
			from: variant.purchasePrice ?? null,
			to: purchasePrice
		});
		variantPatch.purchasePrice = purchasePrice;
	}

	let stockDelta = 0;
	if (row.stock !== undefined && options.stockMode === 'add') stockDelta = row.stock;
	if (row.stock !== undefined && options.stockMode === 'set') {
		const target = row.stock - (await heldByOpenOrders(ctx, variant._id));
		if (target < 0) return fail(`Counted ${row.stock}, but open orders hold more`);
		stockDelta = target - variant.stock;
	}

	return {
		row: {
			...planned,
			status: changes.length || stockDelta ? 'update' : 'unchanged',
			changes,
			stockDelta
		},
		variant,
		product,
		productPatch,
		variantPatch
	};
};

/** A short fingerprint of a plan, so the apply can refuse if the catalogue moved since the preview. */
const fingerprint = (rows: PlannedRow[]) => {
	const text = JSON.stringify(rows);
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return `${rows.length}-${hash.toString(16)}`;
};

const planWrites = async (ctx: QueryCtx, rows: ImportRow[], options: ImportOptions) => {
	if (rows.length > MAX_IMPORT_ROWS) {
		throw new ConvexError(`A sheet can have at most ${MAX_IMPORT_ROWS} rows; split it`);
	}
	if (options.newCategoryId && !(await ctx.db.get('categories', options.newCategoryId))) {
		throw new ConvexError('Category not found');
	}
	const seen = new Map<string, number>();
	const writes: Write[] = [];
	for (const row of rows) writes.push(await planRow(ctx, row, options, seen));
	return writes;
};

/** The preview: what each row would do, and the fingerprint the apply must match. */
export const planImport = async (ctx: QueryCtx, rows: ImportRow[], options: ImportOptions) => {
	const planned = (await planWrites(ctx, rows, options)).map((write) => write.row);
	return { rows: planned, fingerprint: fingerprint(planned) };
};

/**
 * Writes the plan in one transaction: every row or none. Rows with errors are skipped (the
 * preview showed them). Refused if the plan differs from the one previewed.
 */
export const applyImport = async (
	ctx: MutationCtx,
	rows: ImportRow[],
	options: ImportOptions,
	expected: string,
	by: string
) => {
	const writes = await planWrites(ctx, rows, options);
	if (fingerprint(writes.map((write) => write.row)) !== expected) {
		throw new ConvexError('The catalogue changed since the preview. Preview the sheet again.');
	}
	const result = { created: 0, updated: 0 };
	for (const write of writes) {
		const { row } = write;
		let variantId: Id<'productVariants'> | undefined = write.variant?._id;
		if (write.create && options.newCategoryId) {
			const { title, hsn, gstRate, mrp, price, purchasePrice } = write.create;
			const productId = await ctx.db.insert('products', {
				title,
				slug: await uniqueProductSlug(ctx, title),
				categoryId: options.newCategoryId,
				kind: hsn.startsWith('4901') ? 'book' : 'stationery',
				hsn,
				gstRate,
				isActive: true,
				searchText: buildSearchText({ title })
			});
			variantId = await ctx.db.insert('productVariants', {
				productId,
				label: 'Default',
				sku: row.sku,
				mrp,
				price,
				purchasePrice,
				stock: 0,
				lowStockAt: IMPORT_LOW_STOCK_AT,
				sortOrder: 1,
				isActive: true
			});
			result.created += 1;
		} else if (row.status === 'update' && write.product && write.variant) {
			if (Object.keys(write.productPatch).length) {
				await ctx.db.patch('products', write.product._id, write.productPatch);
			}
			if (Object.keys(write.variantPatch).length) {
				await ctx.db.patch('productVariants', write.variant._id, write.variantPatch);
			}
			result.updated += 1;
		} else {
			continue;
		}
		if (row.stockDelta && variantId) {
			await adjustStock(ctx, { variantId, delta: row.stockDelta, reason: 'import', by });
		}
	}
	return result;
};
