import type { PageServerLoad } from './$types';
import { loadListing } from '#lib/store/server/listing.server.js';

export const load = (async ({ url }) => ({
	title: null as string | null,
	listing: await loadListing(undefined, url)
})) satisfies PageServerLoad;
