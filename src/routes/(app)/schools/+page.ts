import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import type { PageLoad } from './$types.js';

export const load = (async () => ({
	catalog: await convexLoad(api.bundle.listBundleCatalog, {})
})) satisfies PageLoad;
