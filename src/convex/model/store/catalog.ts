// Derived catalogue fields. Ported from the old store (legacy/src/convex/slugs.ts,
// productSearch.ts); step 2 builds search on top of them.

/** A URL-safe slug. Generated once at insert; never changed, because URLs depend on it. */
export function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'product';
}

/** A slug not in `used`, suffixed -2, -3, … on collision. Reserves it in `used`. */
export function reserveUniqueSlug(base: string, used: Set<string>): string {
	let slug = base;
	let n = 1;
	while (used.has(slug)) {
		n += 1;
		slug = `${base}-${n}`;
	}
	used.add(slug);
	return slug;
}

/** The text behind the products search index. Rebuild it on every product insert or update. */
export function buildSearchText(p: {
	title: string;
	author?: string;
	publisher?: string;
	isbn?: string;
	subject?: string;
}): string {
	return [p.title, p.author, p.publisher, p.isbn, p.subject].filter(Boolean).join(' ');
}
