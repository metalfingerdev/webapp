import { convexLoadPaginated } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import { error } from '@sveltejs/kit';
import { parseShopFilters } from '$lib/shop/query-params.js';
import type { PageLoad } from './$types.js';

const CATEGORIES = ['book', 'clothes', 'stationary'] as const;
type Category = (typeof CATEGORIES)[number];

export const load = (async ({ params, url }) => {
	if (!CATEGORIES.includes(params.category as Category)) {
		error(404, 'Unknown category');
	}
	const category = params.category as Category;

	return {
		category,
		products: await convexLoadPaginated(
			api.products.listShopProducts,
			{ category, ...parseShopFilters(url.searchParams) },
			{ initialNumItems: 50 }
		)
	};
}) satisfies PageLoad;
