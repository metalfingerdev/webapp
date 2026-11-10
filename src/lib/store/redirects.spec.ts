import { describe, expect, it } from 'vitest';
import { legacyRedirect } from './redirects';
import { robotsTxt } from './seo';

describe('old WooCommerce addresses', () => {
	it('send old pages to their new home, with or without a trailing slash', () => {
		expect(legacyRedirect('/product-category/ris-sets/')).toBe('/schools');
		expect(legacyRedirect('/product-category/ncert-books')).toBe('/shop');
		expect(legacyRedirect('/product/some-book/')).toBe('/shop');
	});

	it('leave the new store alone, so nothing loops', () => {
		for (const path of [
			'/',
			'/shop',
			'/product-on-demand',
			'/product-on-demand/',
			'/schools/ryan',
			'/orders'
		])
			expect(legacyRedirect(path), path).toBeNull();
		// every target is itself not redirected
		for (const path of ['/product-category/x', '/product/y', '/my-account', '/shop-2'])
			expect(legacyRedirect(legacyRedirect(path)!)).toBeNull();
	});
});

describe('robots.txt', () => {
	it('keeps staging out of search engines and production out of private pages only', () => {
		expect(robotsTxt('https://x.test', true)).toContain('Disallow: /\n');
		const live = robotsTxt('https://x.test', false);
		expect(live).not.toMatch(/Disallow: \/\n/);
		expect(live).toContain('Disallow: /admin');
		expect(live).toContain('Sitemap: https://x.test/sitemap.xml');
	});
});
