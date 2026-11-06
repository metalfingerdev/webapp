import { createConvexHttpClient } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import { building } from '$app/env';

/** A signed-out Convex client for the public catalogue's server loads (no token on purpose). */
export const publicClient = () => {
	if (building) throw new Error('The catalogue is not prerendered');
	return createConvexHttpClient();
};
