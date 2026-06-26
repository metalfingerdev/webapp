import { convexLoadPaginated } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import type { PageLoad } from './$types.js';

// SSR the catalog; hydrates into a live paginated subscription on the client
// (so "Load more" and stock updates stay reactive). With `?q=`, the same page
// renders full-text search results instead of the whole catalog.
export const load = (async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	if (q) {
		return {
			q,
			products: await convexLoadPaginated(
				api.products.searchProductsPaginated,
				{ term: q },
				{ initialNumItems: 50 }
			)
		};
	}

	return {
		q: '',
		products: await convexLoadPaginated(api.products.getProducts, {}, { initialNumItems: 50 })
	};
}) satisfies PageLoad;
