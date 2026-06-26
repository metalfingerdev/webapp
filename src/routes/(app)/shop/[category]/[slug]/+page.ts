import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';

export const load = (async ({ params }) => {
	// Resolve slug -> product on the server. The raw Convex id is only ever read
	// here (and passed in the hydrated data), never placed in the URL.
	const product = await convexLoad(api.products.getProductBySlug, { slug: params.slug });

	if (!product.data) error(404, 'Product not found');

	// Canonicalize: the category segment must match the product's real category,
	// otherwise 301 to the correct URL (avoids duplicate-content URLs for SEO).
	if (product.data.category !== params.category) {
		redirect(301, `/shop/${product.data.category}/${params.slug}`);
	}

	return { product };
}) satisfies PageLoad;
