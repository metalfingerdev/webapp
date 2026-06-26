import { createConvexHttpClient } from '$lib/sveltekit/index.js';
import { api } from '$convex/_generated/api.js';
import type { RequestHandler } from './$types.js';

// Lists every product URL (plus the listing pages) so search engines can
// discover the full catalog without crawling pagination. Public data only.
export const GET: RequestHandler = async ({ url }) => {
	const client = createConvexHttpClient();
	const entries = await client.query(api.products.getSitemapEntries, {});
	const { origin } = url;

	const locs = [
		`${origin}/shop`,
		...['book', 'clothes', 'stationary'].map((c) => `${origin}/shop/${c}`),
		...entries.map((e) => `${origin}/shop/${e.category}/${e.slug}`)
	];

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		locs.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n') +
		`\n</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
