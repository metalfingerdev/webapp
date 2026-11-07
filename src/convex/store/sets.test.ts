// What a parent sees of a set, and what the picked lines cost. Each test fails if a hidden thing
// leaks through the public set queries or if the total counts something it should not.
import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import {
	defaultSelection,
	summariseSelection,
	type SelectableLine
} from '../model/store/setSelection';
import { setup } from './harness.testutils';

const seedSets = async () => {
	const { t, signedOut } = await setup();
	const ids = await t.run(async (ctx) => {
		await ctx.db.insert('storeSettings', {
			businessName: 'Test',
			shippingFee: 0,
			freeShippingFrom: 0,
			returnWindowDays: 7,
			currentSession: '2026-27',
			placedOrdersOpen: true
		});
		const school = await ctx.db.insert('schools', {
			name: 'Test School',
			slug: 'test-school',
			isActive: true,
			sortOrder: 1
		});
		const hiddenSchool = await ctx.db.insert('schools', {
			name: 'Hidden School',
			slug: 'hidden-school',
			isActive: false,
			sortOrder: 2
		});
		const books = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const product = async (title: string, isActive: boolean, variantActive = true) => {
			const productId = await ctx.db.insert('products', {
				title,
				slug: title.toLowerCase().replace(/ /g, '-'),
				categoryId: books,
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
				stock: 40,
				lowStockAt: 5,
				sortOrder: 0,
				isActive: variantActive
			});
			return productId;
		};
		const makeSet = async (
			schoolId: typeof school,
			label: string,
			session: string,
			isActive = true
		) =>
			ctx.db.insert('schoolSets', {
				schoolId,
				type: 'books',
				label,
				classFrom: 1,
				classTo: 1,
				session,
				sortOrder: 1,
				isActive
			});
		const current = await makeSet(school, 'Class 1', '2026-27');
		await makeSet(school, 'Class 2 (hidden)', '2026-27', false);
		await makeSet(school, 'Class 1 last year', '2025-26');
		const inHiddenSchool = await makeSet(hiddenSchool, 'Class 1', '2026-27');
		const lines = [
			await product('Shown Reader', true),
			await product('Hidden Product Reader', false),
			await product('No Active Size Reader', true, false)
		];
		for (const [i, productId] of lines.entries()) {
			await ctx.db.insert('setItems', {
				setId: current,
				productId,
				quantity: 1,
				isOptional: false,
				sortOrder: i + 1
			});
		}
		return { current, inHiddenSchool };
	});
	return { signedOut, ids };
};

describe('public set queries', () => {
	it('lists only active sets of the current session', async () => {
		const { signedOut } = await seedSets();
		const result = await signedOut.query(api.store.sets.listForSchool, {
			schoolSlug: 'test-school'
		});
		expect(result?.sets.map((s) => s.label)).toEqual(['Class 1']);
		expect(
			await signedOut.query(api.store.sets.listForSchool, { schoolSlug: 'hidden-school' })
		).toBeNull();
	});

	it('leaves out hidden products and sizes, and never shows stock', async () => {
		const { signedOut, ids } = await seedSets();
		const result = await signedOut.query(api.store.sets.getSet, {
			schoolSlug: 'test-school',
			setId: ids.current
		});
		expect(result?.lines.map((l) => l.title)).toEqual(['Shown Reader']);
		expect(result?.lines[0].options[0]).not.toHaveProperty('stock');
	});

	it('refuses a set asked for through the wrong or a hidden school, or a junk id', async () => {
		const { signedOut, ids } = await seedSets();
		const ask = (schoolSlug: string, setId: string) =>
			signedOut.query(api.store.sets.getSet, { schoolSlug, setId });
		expect(await ask('hidden-school', ids.inHiddenSchool)).toBeNull();
		expect(await ask('hidden-school', ids.current)).toBeNull();
		expect(await ask('test-school', ids.inHiddenSchool)).toBeNull();
		expect(await ask('test-school', 'not-an-id')).toBeNull();
	});
});

describe('set selection', () => {
	const line = (
		id: string,
		price: number,
		quantity = 1,
		availability: 'in_stock' | 'out' = 'in_stock'
	): SelectableLine => ({ id, quantity, options: [{ variantId: `${id}-v`, price, availability }] });

	it('counts only ticked lines with a size, times the quantity', () => {
		const lines = [line('a', 10000, 2), line('b', 5000)];
		const all = defaultSelection(lines);
		expect(summariseSelection(lines, all)).toMatchObject({ total: 25000, count: 2 });
		const unticked = { ...all, b: { ...all.b, ticked: false } };
		expect(summariseSelection(lines, unticked)).toMatchObject({ total: 20000, count: 1 });
	});

	it('does not price a line until its size is chosen, and skips sold-out sizes', () => {
		const sized: SelectableLine = {
			id: 'shirt',
			quantity: 2,
			options: [
				{ variantId: 's', price: 30000, availability: 'in_stock' },
				{ variantId: 'm', price: 32000, availability: 'out' }
			]
		};
		const start = defaultSelection([sized]);
		expect(summariseSelection([sized], start)).toMatchObject({ total: 0, needSize: 1 });
		const small = { shirt: { ticked: true, variantId: 's' } };
		expect(summariseSelection([sized], small)).toMatchObject({ total: 60000, needSize: 0 });
		const sold = { shirt: { ticked: true, variantId: 'm' } };
		expect(summariseSelection([sized], sold)).toMatchObject({ total: 0, unavailable: 1 });
		const gone = [line('x', 9900, 1, 'out')];
		expect(defaultSelection(gone).x.ticked).toBe(false);
	});
});
