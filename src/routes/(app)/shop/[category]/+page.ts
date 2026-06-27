import { convexLoadPaginated } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import { error } from '@sveltejs/kit';
import { PRODUCT_CATEGORIES, type ProductCategory } from '$convex/schema.js';
import { parseShopFilters } from '$lib/shop/query-params.js';
import type { PageLoad } from './$types.js';

export const load = (async ({ params, url }) => {
	const category = params.category as ProductCategory;
	// The matcher already gates this route, but keep the guard for safety.
	if (!PRODUCT_CATEGORIES.includes(category)) {
		error(404, 'Unknown category');
	}

	return {
		category,
		products: await convexLoadPaginated(
			api.products.listShopProducts,
			{ category, ...parseShopFilters(url.searchParams) },
			{ initialNumItems: 50 }
		)
	};
}) satisfies PageLoad;
