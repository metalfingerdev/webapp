import { convexLoad } from 'convex-svelte/sveltekit';
import { api } from '$convex/_generated/api.js';
import { error, redirect } from '@sveltejs/kit';
import { PRODUCT_CATEGORIES, type ProductCategory } from '$convex/schema.js';
import type { PageLoad } from './$types.js';

// One polymorphic route. The first segment is either a product category or a
// school slug; we branch on the category list (the same disambiguation a route
// matcher would do, just in code):
//   /shop/book/ganga-hindi   → product
//   /shop/dps-rkpuram/11      → bundle
export const load = (async ({ params }) => {
	const { category, item } = params;

	if (PRODUCT_CATEGORIES.includes(category as ProductCategory)) {
		const product = await convexLoad(api.products.getProductBySlug, { slug: item });
		if (!product.data) error(404, 'Product not found');
		// Canonicalize: the category segment must match the product's real category.
		if (product.data.category !== category) {
			redirect(301, `/shop/${product.data.category}/${item}`);
		}
		return { kind: 'product' as const, product };
	}

	const bundle = await convexLoad(api.bundle.getBundleBySchoolAndGrade, {
		schoolSlug: category,
		gradeSlug: item
	});
	if (!bundle.data) error(404, 'Bundle not found');
	return { kind: 'bundle' as const, bundle };
}) satisfies PageLoad;
