// src/lib/shop/filters.svelte.ts
//
// Shared filter state for the shop. The desktop sidebar and the mobile bottom
// bar are two separate components driving the same filters, so the state lives
// in a context service (same pattern as the navbar / sidebar / cart) rather than
// being threaded through props.
import { setContext, getContext } from 'svelte';

export type SortValue = 'relevance' | 'price-asc' | 'price-desc' | 'newest';

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
	{ value: 'relevance', label: 'Relevance' },
	{ value: 'price-asc', label: 'Price: Low to High' },
	{ value: 'price-desc', label: 'Price: High to Low' },
	{ value: 'newest', label: 'Newest' }
];

export class ShopFilters {
	sort = $state<SortValue>('relevance');
	inStockOnly = $state(false);
	minPrice = $state<number | null>(null);
	maxPrice = $state<number | null>(null);

	clear = () => {
		this.sort = 'relevance';
		this.inStockOnly = false;
		this.minPrice = null;
		this.maxPrice = null;
	};
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
