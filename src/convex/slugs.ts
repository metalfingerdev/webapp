// Slug generation for product URLs. Slugs are generated once at insert time and
// kept stable thereafter (renaming a product does not change its URL).

/** Turn a product name into a URL-safe slug. Falls back to 'product' when the
 * name has no usable ASCII characters (e.g. all punctuation). */
export function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'product';
}

/** Return a slug guaranteed not to be in `used`, suffixing -2, -3, … on
 * collision. Mutates `used` to reserve the returned slug. Use when generating
 * many slugs in one pass (the catalog is already in memory). */
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
