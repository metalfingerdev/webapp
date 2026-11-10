import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { strings } from '#lib/store/strings.js';
import { policyTexts } from '#lib/store/policies.js';

export const load = (({ params }) => {
	const policy = strings.policies.list.find((p) => p.slug === params.slug);
	if (!policy) error(404, 'Page not found');
	return { title: policy.title, text: policyTexts[policy.slug] ?? { sections: [] } };
}) satisfies PageServerLoad;
