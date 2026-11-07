// The cart must refuse strangers, never hold what is hidden or more than the shelf has, and keep
// each customer's lines to themselves. Each test fails if one of those breaks.
import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import { MAX_LINE_QUANTITY } from '../model/store/cart';
import { setup } from './harness.testutils';

const seed = async () => {
	const world = await setup();
	const ids = await world.t.run(async (ctx) => {
		const categoryId = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const variant = async (title: string, stock: number, isActive = true) => {
			const productId = await ctx.db.insert('products', {
				title,
				slug: title,
				categoryId,
				kind: 'book',
				hsn: '0000',
				gstRate: 0,
				isActive,
				searchText: title
			});
			return ctx.db.insert('productVariants', {
				productId,
				label: 'Default',
				mrp: 20000,
				price: 15000,
				stock,
				lowStockAt: 2,
				sortOrder: 0,
				isActive: true
			});
		};
		return {
			plenty: await variant('plenty', 100),
			three: await variant('three', 3),
			hidden: await variant('hidden', 10, false)
		};
	});
	return { ...world, ids };
};

describe('cart', () => {
	it('refuses a signed-out caller', async () => {
		const { signedOut } = await seed();
		await expect(signedOut.query(api.store.cart.getCart, {})).rejects.toThrow();
		await expect(signedOut.mutation(api.store.cart.setLines, { lines: [] })).rejects.toThrow();
		await expect(signedOut.mutation(api.store.cart.mergeGuest, { lines: [] })).rejects.toThrow();
	});

	it('drops hidden and unknown variants and clamps quantities to the shelf and the cap', async () => {
		const { customer, ids } = await seed();
		await customer.mutation(api.store.cart.setLines, {
			lines: [
				{ variantId: ids.plenty, quantity: 500 },
				{ variantId: ids.three, quantity: 9 },
				{ variantId: ids.hidden, quantity: 1 },
				{ variantId: 'not-an-id', quantity: 1 },
				{ variantId: ids.plenty, quantity: -2 }
			]
		});
		const cart = await customer.query(api.store.cart.getCart, {});
		expect(cart.lines.map((l) => [l.variantId, l.quantity])).toEqual([
			[ids.plenty, MAX_LINE_QUANTITY],
			[ids.three, 3]
		]);
		expect(cart.subtotal).toBe(15000 * (MAX_LINE_QUANTITY + 3));
	});

	it('adds the guest lines to the account cart on sign-in, within the cap', async () => {
		const { customer, ids } = await seed();
		await customer.mutation(api.store.cart.setLines, {
			lines: [{ variantId: ids.plenty, quantity: 8 }]
		});
		await customer.mutation(api.store.cart.mergeGuest, {
			lines: [
				{ variantId: ids.plenty, quantity: 5 },
				{ variantId: ids.three, quantity: 1 }
			]
		});
		const cart = await customer.query(api.store.cart.getCart, {});
		expect(cart.lines.map((l) => [l.variantId, l.quantity])).toEqual([
			[ids.plenty, MAX_LINE_QUANTITY],
			[ids.three, 1]
		]);
	});

	it("keeps one customer's cart out of another's", async () => {
		const { customer, otherCustomer, ids } = await seed();
		await customer.mutation(api.store.cart.setLines, {
			lines: [{ variantId: ids.plenty, quantity: 1 }]
		});
		expect((await otherCustomer.query(api.store.cart.getCart, {})).lines).toEqual([]);
	});

	it('prices a guest cart without storing it', async () => {
		const { signedOut, t, ids } = await seed();
		const cart = await signedOut.query(api.store.cart.getGuestCart, {
			lines: [{ variantId: ids.three, quantity: 2 }]
		});
		expect(cart.subtotal).toBe(30000);
		expect(await t.run((ctx) => ctx.db.query('carts').first())).toBeNull();
	});
});
