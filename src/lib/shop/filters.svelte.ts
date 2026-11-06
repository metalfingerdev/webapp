// src/lib/shop/filters.svelte.ts
//
// Shop filters, backed by the URL query string (the single source of truth).
// Getters read the current params reactively; setters push a new URL via goto(),
// which re-runs the page loader so the SSR'd paginated query re-fetches with the
// filters applied. Both the desktop sidebar and the mobile bar share this.
import { setContext, getContext } from 'svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';

export type SortValue = 'relevance' | 'price-asc' | 'price-desc' | 'newest';

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
	{ value: 'relevance', label: 'Relevance' },
	{ value: 'price-asc', label: 'Price: Low to High' },
	{ value: 'price-desc', label: 'Price: High to Low' },
	{ value: 'newest', label: 'Newest' }
];

export class ShopFilters {
	get #params() {
		return page.url.searchParams;
	}

	get sort(): SortValue {
		const v = this.#params.get('sort');
		return v === 'price-asc' || v === 'price-desc' || v === 'newest' ? v : 'relevance';
	}

	get inStockOnly(): boolean {
		return this.#params.get('stock') === '1';
	}

	get minPrice(): number | null {
		const v = this.#params.get('min');
		return v ? Number(v) : null;
	}

	get maxPrice(): number | null {
		const v = this.#params.get('max');
		return v ? Number(v) : null;
	}

	// How many non-default filters are active (for a badge on the mobile bar).
	get activeCount(): number {
		let n = 0;
		if (this.sort !== 'relevance') n++;
		if (this.inStockOnly) n++;
		if (this.minPrice != null || this.maxPrice != null) n++;
		return n;
	}

	#commit(patch: Record<string, string | null>) {
		const sp = new URLSearchParams(this.#params);
		for (const [k, v] of Object.entries(patch)) {
			if (v === null || v === '') sp.delete(k);
			else sp.set(k, v);
		}
		const qs = sp.toString();
		const url = qs ? `${page.url.pathname}?${qs}` : page.url.pathname;
		// replaceState keeps filter churn out of the back-button history.
		goto(url, { keepFocus: true, noScroll: true, replaceState: true });
	}

	setSort = (v: SortValue) => this.#commit({ sort: v === 'relevance' ? null : v });
	setInStock = (v: boolean) => this.#commit({ stock: v ? '1' : null });
	setMin = (v: number | null) => this.#commit({ min: v != null && v > 0 ? String(v) : null });
	setMax = (v: number | null) => this.#commit({ max: v != null && v > 0 ? String(v) : null });
	clear = () => this.#commit({ sort: null, stock: null, min: null, max: null });
}

const SHOP_FILTERS_KEY = Symbol('shop-filters');

export function initShopFilters() {
	const filters = new ShopFilters();
	setContext(SHOP_FILTERS_KEY, filters);
	return filters;
}

export function useShopFilters() {
	const ctx = getContext<ShopFilters>(SHOP_FILTERS_KEY);
	if (!ctx) throw new Error('useShopFilters() must be called within initShopFilters() tree');
	return ctx;
}
