import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load = (async ({ parent }) => {
	const { currentUser } = await parent();
	if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'developer')) {
		redirect(303, '/');
	}
	return {};
}) satisfies PageServerLoad;
