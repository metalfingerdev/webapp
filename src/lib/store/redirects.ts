// 301 map from the old WooCommerce site's addresses, so links in Google and on WhatsApp keep working.
// Only addresses seen on the live site are here. TODO (dictate): the exact product, category and
// school-set URLs need the WooCommerce export; add them to EXACT, most specific first.

const EXACT: Record<string, string> = {
	'/shop-2': '/shop',
	'/cart-2': '/cart',
	'/checkout-2': '/checkout',
	'/my-account': '/account'
};

/** Old prefixes sent to a listing, because the old slugs are not known yet. */
const PREFIXES: [string, string][] = [
	['/product-category/ris-sets', '/schools'],
	['/product-category', '/shop'],
	['/product-tag', '/shop'],
	['/product', '/shop']
];

/** Where an old address now lives, or null when the address is not an old one. Never loops. */
export const legacyRedirect = (pathname: string): string | null => {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	const lower = path.toLowerCase();
	if (EXACT[lower]) return EXACT[lower] === path ? null : EXACT[lower];
	for (const [from, to] of PREFIXES) {
		if (lower === from || lower.startsWith(from + '/')) return to;
	}
	return null;
};
