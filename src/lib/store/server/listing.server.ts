import { api } from '#convex/_generated/api.js';
import { publicClient } from './client.server.js';

export const PAGE_SIZE = 24;

/** The filters in the URL (the single source of truth), as the catalogue query's arguments. */
export const parseFilters = (sp: URLSearchParams) => {
	const number = (key: string) => {
		const n = Number(sp.get(key));
		return sp.get(key) && Number.isFinite(n) ? n : undefined;
	};
	const rupeesToPaise = (key: string) => {
		const n = number(key);
		return n !== undefined && n > 0 ? Math.round(n * 100) : undefined;
	};
	const classLevel = number('class');
	return {
		classLevel: classLevel !== undefined && Number.isInteger(classLevel) ? classLevel : undefined,
		minPrice: rupeesToPaise('min'),
		maxPrice: rupeesToPaise('max'),
		inStockOnly: sp.get('stock') === '1' ? true : undefined
	};
};

/** The first page of a category listing, or the search results when `q` is set. */
export const loadListing = async (categorySlug: string | undefined, url: URL) => {
	const client = publicClient();
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q) {
		const products = await client.query(api.store.catalog.search, { text: q, limit: 48 });
		return { q, products, isDone: true, cursor: null, args: null };
	}
	const args = { categorySlug, ...parseFilters(url.searchParams) };
	const result = await client.query(api.store.catalog.listProducts, {
		...args,
		paginationOpts: { numItems: PAGE_SIZE, cursor: null }
	});
	return {
		q: '',
		products: result.page,
		isDone: result.isDone,
		cursor: result.continueCursor,
		args
	};
};
