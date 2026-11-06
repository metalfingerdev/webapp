// The catalogue's promises to the customer: hidden things stay hidden, and nothing but "few left"
// or "out" is said about stock. Each test fails if a public query leaks.
import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import { setup } from './harness.testutils';

const seedCatalogue = async () => {
	const { t, signedOut } = await setup();
	const ids = await t.run(async (ctx) => {
		const books = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const hiddenCategory = await ctx.db.insert('categories', {
			name: 'Old',
			slug: 'old',
			parentId: books,
			sortOrder: 2,
			isActive: false
		});
		const product = async (
			title: string,
			categoryId: typeof books,
			isActive: boolean,
			stock: number,
			variantActive = true
		) => {
			const productId = await ctx.db.insert('products', {
				title,
				slug: title.toLowerCase().replace(/ /g, '-'),
				categoryId,
				kind: 'book',
				hsn: '0000',
				gstRate: 0,
				isActive,
				searchText: title
			});
			await ctx.db.insert('productVariants', {
				productId,
				label: 'Default',
				mrp: 20000,
				price: 15000,
				stock,
				lowStockAt: 5,
				sortOrder: 0,
				isActive: variantActive
			});
			return productId;
		};
		await product('Visible Reader', books, true, 40);
		await product('Last Copies Reader', books, true, 3);
		await product('Hidden Product Reader', books, false, 40);
		await product('Hidden Category Reader', hiddenCategory, true, 40);
		await product('No Active Variant Reader', books, true, 40, false);
		return { books };
	});
	return { t, signedOut, ids };
};

describe('public catalogue', () => {
	it('lists only visible products and says nothing about exact stock', async () => {
		const { signedOut } = await seedCatalogue();
		const page = await signedOut.query(api.store.catalog.listProducts, {
			paginationOpts: { numItems: 50, cursor: null }
		});
		expect(page.page.map((p) => p.title).sort()).toEqual(['Last Copies Reader', 'Visible Reader']);
		const few = page.page.find((p) => p.title === 'Last Copies Reader');
		expect(few?.availability).toBe('few_left');
		for (const card of page.page) {
			expect(card).not.toHaveProperty('stock');
			expect(card).not.toHaveProperty('searchText');
		}
	});

	it('search and the product page hide the same things', async () => {
		const { signedOut } = await seedCatalogue();
		const hits = await signedOut.query(api.store.catalog.search, { text: 'Reader' });
		expect(hits.map((p) => p.title).sort()).toEqual(['Last Copies Reader', 'Visible Reader']);
		const hidden = await signedOut.query(api.store.catalog.getProduct, {
			categorySlug: 'old',
			slug: 'hidden-category-reader'
		});
		expect(hidden).toBeNull();
		const inactive = await signedOut.query(api.store.catalog.getProduct, {
			categorySlug: 'books',
			slug: 'hidden-product-reader'
		});
		expect(inactive).toBeNull();
	});

	it('a hidden category is gone from the tree and its page is empty', async () => {
		const { signedOut } = await seedCatalogue();
		const tree = await signedOut.query(api.store.catalog.listCategories, {});
		expect(tree).toEqual([{ name: 'Books', slug: 'books', children: [] }]);
		const page = await signedOut.query(api.store.catalog.listProducts, {
			categorySlug: 'old',
			paginationOpts: { numItems: 50, cursor: null }
		});
		expect(page.page).toEqual([]);
	});
});
