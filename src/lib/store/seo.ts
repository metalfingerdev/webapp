// Sitemap and robots.txt text, kept apart from the routes so they can be tested.

/** Pages that always exist. The catalogue's pages come from `store/catalog.ts#sitemapPaths`. */
export const STATIC_SITEMAP_PATHS = ['/', '/shop', '/schools', '/policies', '/product-on-demand'];

/** Pages with no value to a search engine, or private to a signed-in person. */
export const PRIVATE_PATHS = [
	'/admin',
	'/account',
	'/checkout',
	'/orders',
	'/cart',
	'/api',
	'/signin'
];

const escapeXml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const sitemapXml = (origin: string, paths: string[]) =>
	`<?xml version="1.0" encoding="UTF-8"?>\n` +
	`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
	[...new Set(paths)]
		.map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`)
		.join('\n') +
	`\n</urlset>\n`;

/** Staging must not be indexed: it would compete with the real site and show demo data. */
export const robotsTxt = (origin: string, staging: boolean) =>
	staging
		? 'User-agent: *\nDisallow: /\n'
		: `User-agent: *\n${PRIVATE_PATHS.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${origin}/sitemap.xml\n`;
