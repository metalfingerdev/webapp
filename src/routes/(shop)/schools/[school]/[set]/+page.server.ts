import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '#convex/_generated/api.js';
import { publicClient } from '#lib/store/server/client.server.js';

export const load = (async ({ params }) => {
	const result = await publicClient().query(api.store.sets.getSet, {
		schoolSlug: params.school,
		setId: params.set
	});
	if (!result) error(404, 'Set not found');
	return result;
}) satisfies PageServerLoad;
