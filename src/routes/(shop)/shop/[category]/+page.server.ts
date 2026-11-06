import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadListing } from '#lib/store/server/listing.server.js';

export const load = (async ({ params, url, parent }) => {
	const { categories } = await parent();
	const top = categories.find((c) => c.slug === params.category);
	const child = categories.flatMap((c) => c.children).find((c) => c.slug === params.category);
	const category = top ?? child;
	if (!category) error(404, 'Category not found');
	return {
		title: category.name,
		subcategories: top?.children ?? [],
		listing: await loadListing(params.category, url)
	};
}) satisfies PageServerLoad;
