import type { LayoutServerLoad } from './$types';
import { api } from '#convex/_generated/api.js';
import { publicClient } from '#lib/store/server/client.server.js';

// The navigation, home page and footer need the same three public lists on every shop page
export const load = (async () => {
	const client = publicClient();
	const [categories, schools, contact] = await Promise.all([
		client.query(api.store.catalog.listCategories, {}),
		client.query(api.store.catalog.listSchools, {}),
		client.query(api.store.catalog.getContact, {})
	]);
	return { categories, schools, contact };
}) satisfies LayoutServerLoad;
