import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { strings } from '#lib/store/strings.js';

export const load = (({ params }) => {
	const policy = strings.policies.list.find((p) => p.slug === params.slug);
	if (!policy) error(404, 'Page not found');
	return { title: policy.title };
}) satisfies PageServerLoad;
