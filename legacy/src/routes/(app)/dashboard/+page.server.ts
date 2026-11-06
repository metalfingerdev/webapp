import { redirect } from '@sveltejs/kit';
import { createConvexHttpClient } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import { api } from '#convex/_generated/api.js';
import type { PageServerLoad } from './$types.js';

// UX only: every dashboard function checks `requireAppAdmin` itself
export const load = (async ({ locals }) => {
	const client = createConvexHttpClient({ token: locals.token });
	const isAdmin = await client.query(api.admin.queries.isCurrentUserAdmin, {}).catch(() => false);
	if (!isAdmin) redirect(303, '/');
	return {};
}) satisfies PageServerLoad;
