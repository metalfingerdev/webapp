// src/lib/shop/query-params.ts
//
// Parse the shop filter query string into Convex `listShopProducts` args. Shared
// by the /shop and /shop/[category] loaders so the URL contract lives in one
// place (and matches the setters in filters.svelte.ts).

const SORTS = ['relevance', 'price-asc', 'price-desc', 'newest'] as const;
export type ShopSort = (typeof SORTS)[number];

function parseSort(v: string | null): ShopSort {
	return (SORTS as readonly string[]).includes(v ?? '') ? (v as ShopSort) : 'relevance';
}

// Rupees in the URL → paise for the query. Ignores blanks / non-positive / NaN.
function toPaise(v: string | null): number | undefined {
	const n = v ? Number(v) : NaN;
	return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
}

export function parseShopFilters(sp: URLSearchParams) {
	return {
		sort: parseSort(sp.get('sort')),
		minPaise: toPaise(sp.get('min')),
		maxPaise: toPaise(sp.get('max')),
		inStockOnly: sp.get('stock') === '1' ? true : undefined
	};
}
