import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '#convex/_generated/api.js';
import { publicClient } from '#lib/store/server/client.server.js';

export const load = (async ({ params }) => {
	const client = publicClient();
	const args = { schoolSlug: params.school, setId: params.set };
	const [result, extras] = await Promise.all([
		client.query(api.store.sets.getSet, args),
		client.query(api.store.sets.listExtras, args)
	]);
	if (!result) error(404, 'Set not found');
	return { ...result, extras };
}) satisfies PageServerLoad;
