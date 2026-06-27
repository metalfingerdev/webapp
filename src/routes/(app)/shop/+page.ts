import { convexLoadPaginated } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import { parseShopFilters } from '$lib/shop/query-params.js';
import type { PageLoad } from './$types.js';

// SSR the catalog; hydrates into a live paginated subscription on the client
// (so "Load more" and stock updates stay reactive). Search (?q=) and the filter
// params (?sort/min/max/stock) all flow through the one listShopProducts query;
// changing a filter re-runs this load via the URL.
export const load = (async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	return {
		q,
		products: await convexLoadPaginated(
			api.products.listShopProducts,
			{ q: q || undefined, ...parseShopFilters(url.searchParams) },
			{ initialNumItems: 50 }
		)
	};
}) satisfies PageLoad;
