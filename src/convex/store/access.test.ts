import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import { setup } from './harness.testutils';
import type { Id } from '../_generated/dataModel';

// A variant with some stock, created directly (tests may; app code goes through adjustStock).
const seedVariant = async (t: Awaited<ReturnType<typeof setup>>['t'], stock: number) =>
	t.run(async (ctx) => {
		const categoryId = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const productId = await ctx.db.insert('products', {
			title: 'Test book',
			slug: 'test-book',
			categoryId,
			kind: 'book',
			hsn: '0000',
			gstRate: 0,
			isActive: true,
			searchText: 'Test book'
		});
		return ctx.db.insert('productVariants', {
			productId,
			label: 'Default',
			mrp: 100_00,
			price: 100_00,
			stock,
			lowStockAt: 1,
			sortOrder: 1,
			isActive: true
		});
	});

const stockOf = (t: Awaited<ReturnType<typeof setup>>['t'], variantId: Id<'productVariants'>) =>
	t.run(async (ctx) => ({
		stock: (await ctx.db.get('productVariants', variantId))!.stock,
		log: await ctx.db
			.query('stockAdjustments')
			.withIndex('by_variantId_and_at', (q) => q.eq('variantId', variantId))
			.take(10)
	}));

describe('admin stock adjustment', () => {
	it('refuses signed-out callers and customers, and changes nothing', async () => {
		const { t, signedOut, customer } = await setup();
		const variantId = await seedVariant(t, 5);
		const args = { variantId, delta: 3, reason: 'received' as const };

		await expect(signedOut.mutation(api.store.admin.stock.adjust, args)).rejects.toThrow(
			/Not authenticated/
		);
		await expect(customer.mutation(api.store.admin.stock.adjust, args)).rejects.toThrow(
			/Forbidden/
		);
		expect(await stockOf(t, variantId)).toEqual({ stock: 5, log: [] });
	});

	it('lets an admin change stock and logs who did it', async () => {
		const { t, admin } = await setup();
		const variantId = await seedVariant(t, 5);

		await expect(
			admin.mutation(api.store.admin.stock.adjust, { variantId, delta: -2, reason: 'damaged' })
		).resolves.toBe(3);
		const { stock, log } = await stockOf(t, variantId);
		expect(stock).toBe(3);
		expect(log).toMatchObject([{ delta: -2, stockAfter: 3, reason: 'damaged', by: admin.userId }]);
	});

	it('never takes stock below zero', async () => {
		const { t, admin } = await setup();
		const variantId = await seedVariant(t, 2);

		await expect(
			admin.mutation(api.store.admin.stock.adjust, { variantId, delta: -3, reason: 'damaged' })
		).rejects.toThrow(/Only 2 in stock/);
		expect(await stockOf(t, variantId)).toEqual({ stock: 2, log: [] });
	});
});
