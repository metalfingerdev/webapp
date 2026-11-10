import type { RequestHandler } from './$types';
import { api } from '#convex/_generated/api.js';
import { publicClient } from '#lib/store/server/client.server.js';
import { STATIC_SITEMAP_PATHS, sitemapXml } from '#lib/store/seo.js';
import { strings } from '#lib/store/strings.js';

// Public data only: the catalogue's own `sitemapPaths` query decides what may be listed.
export const GET: RequestHandler = async ({ url }) => {
	const dynamic = await publicClient().query(api.store.catalog.sitemapPaths, {});
	const policies = strings.policies.list.map((p) => `/policies/${p.slug}`);
	const body = sitemapXml(url.origin, [...STATIC_SITEMAP_PATHS, ...policies, ...dynamic]);
	return new Response(body, {
		headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }
	});
};
