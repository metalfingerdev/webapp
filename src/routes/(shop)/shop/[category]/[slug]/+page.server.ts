import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '#convex/_generated/api.js';
import { publicClient } from '#lib/store/server/client.server.js';

export const load = (async ({ params }) => {
	const product = await publicClient().query(api.store.catalog.getProduct, {
		categorySlug: params.category,
		slug: params.slug
	});
	if (!product) error(404, 'Product not found');
	return { product };
}) satisfies PageServerLoad;
