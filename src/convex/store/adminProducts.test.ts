import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { setup } from './harness.testutils';
import type { OrderStatus } from './validators';

type T = Awaited<ReturnType<typeof setup>>['t'];

// A book with one size, created directly (tests may; app code goes through adjustStock).
const seedBook = async (t: T, opts: { stock: number; sku?: string; price?: number }) =>
	t.run(async (ctx) => {
		const categoryId = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const productId = await ctx.db.insert('products', {
			title: 'Maths 1',
			slug: 'maths-1',
			categoryId,
			kind: 'book',
			hsn: '4901',
			gstRate: 0,
			isActive: true,
			searchText: 'Maths 1'
		});
		const variantId = await ctx.db.insert('productVariants', {
			productId,
			label: 'Default',
			sku: opts.sku,
			mrp: 200_00,
			price: opts.price ?? 150_00,
			stock: opts.stock,
			lowStockAt: 1,
			sortOrder: 1,
			isActive: true
		});
		return { categoryId, productId, variantId };
	});

// An order holding `quantity` of a variant, in the given status.
const seedOrder = (t: T, variantId: Id<'productVariants'>, status: OrderStatus, quantity: number) =>
	t.run(async (ctx) => {
		const variant = (await ctx.db.get('productVariants', variantId))!;
		const orderId = await ctx.db.insert('orders', {
			userId: 'someone',
			number: `T-${status}`,
			status,
			paymentStatus: 'pending',
			address: {
				name: 'A',
				phone: '+919876543210', // allow-identifier: made-up test number
				line1: 'x',
				city: 'y',
				state: 'z',
				pincode: '121001'
			},
			paymentMethod: 'cod',
			zoneName: 'Test',
			deliveryMethod: 'courier',
			subtotal: 0,
			shippingFee: 0,
			total: 0,
			placedAt: Date.now()
		});
		await ctx.db.insert('orderItems', {
			orderId,
			productId: variant.productId,
			variantId,
			title: 'Maths 1',
			hsn: '4901',
			gstRate: 0,
			unitPrice: variant.price,
			quantity
		});
	});

const read = (t: T, variantId: Id<'productVariants'>) =>
	t.run(async (ctx) => ({
		variant: (await ctx.db.get('productVariants', variantId))!,
		log: await ctx.db
			.query('stockAdjustments')
			.withIndex('by_variantId_and_at', (q) => q.eq('variantId', variantId))
			.take(10)
	}));

describe('admin catalogue access', () => {
	it('refuses signed-out callers and customers on every admin catalogue function', async () => {
		const { t, signedOut, customer } = await setup();
		const { categoryId, productId, variantId } = await seedBook(t, { stock: 5, sku: 'A1' });
		const product = {
			title: 'X',
			categoryId,
			kind: 'book' as const,
			hsn: '4901',
			gstRate: 0 as const
		};
		const variant = { label: 'Default', mrp: 100, price: 100, lowStockAt: 1, isActive: true };
		const rows = [{ line: 1, code: 'A1', stock: 9 }];
		const options = { stockMode: 'set' as const };

		for (const caller of [signedOut, customer]) {
			const calls = [
				() =>
					caller.query(api.store.admin.products.list, {
						paginationOpts: { numItems: 10, cursor: null },
						status: 'all',
						stock: 'any'
					}),
				() => caller.query(api.store.admin.products.get, { productId }),
				() => caller.mutation(api.store.admin.products.create, { product, variant }),
				() => caller.mutation(api.store.admin.products.update, { productId, product }),
				() => caller.mutation(api.store.admin.products.setActive, { productId, isActive: false }),
				() => caller.mutation(api.store.admin.products.saveVariant, { productId, variant }),
				() =>
					caller.mutation(api.store.admin.stock.count, { variantId, counted: 1, shownStock: 5 }),
				() => caller.query(api.store.admin.import.plan, { rows, options }),
				() => caller.mutation(api.store.admin.import.apply, { rows, options, fingerprint: 'x' })
			];
			for (const call of calls) await expect(call()).rejects.toThrow(/Not authenticated|Forbidden/);
		}
		const { variant: after } = await read(t, variantId);
		expect(after.stock).toBe(5);
		expect(await t.run((ctx) => ctx.db.get('products', productId))).toMatchObject({
			title: 'Maths 1',
			isActive: true
		});
	});
});

describe('shelf count', () => {
	it('sets stock to the count minus what unshipped orders hold, and logs it', async () => {
		const { t, admin } = await setup();
		const { variantId } = await seedBook(t, { stock: 4 });
		await seedOrder(t, variantId, 'paid', 2); // on the shelf, already off stock
		await seedOrder(t, variantId, 'shipped', 5); // gone: not on the shelf
		await seedOrder(t, variantId, 'cancelled', 3); // put back already

		await expect(
			admin.mutation(api.store.admin.stock.count, { variantId, counted: 10, shownStock: 4 })
		).resolves.toBe(8);
		const { variant, log } = await read(t, variantId);
		expect(variant.stock).toBe(8);
		expect(log).toMatchObject([{ delta: 4, stockAfter: 8, reason: 'count', by: admin.userId }]);
	});

	it('refuses when stock moved since the screen showed it', async () => {
		const { t, admin } = await setup();
		const { variantId } = await seedBook(t, { stock: 4 });

		await expect(
			admin.mutation(api.store.admin.stock.count, { variantId, counted: 10, shownStock: 3 })
		).rejects.toThrow(/Count again/);
		expect((await read(t, variantId)).variant.stock).toBe(4);
	});

	it('refuses a count below what open orders hold', async () => {
		const { t, admin } = await setup();
		const { variantId } = await seedBook(t, { stock: 0 });
		await seedOrder(t, variantId, 'packed', 3);

		await expect(
			admin.mutation(api.store.admin.stock.count, { variantId, counted: 2, shownStock: 0 })
		).rejects.toThrow(/open orders hold 3/);
	});
});

describe('stock-sheet import', () => {
	it('applies exactly what the preview showed: blanks keep values, bad rows change nothing', async () => {
		const { t, admin } = await setup();
		const { categoryId, variantId } = await seedBook(t, { stock: 5, sku: 'A1' });
		const rows = [
			// price changes; blank MRP keeps ₹200; stock added as received
			{ line: 9, code: 'A1', name: 'Maths 1', price: 140_00, stock: 3 },
			// a new product
			{ line: 10, code: 'B2', name: 'Atlas', price: 90_00, hsn: '4901', tax: 'GST 0%', stock: 4 },
			// a price above the MRP: an error, skipped
			{ line: 11, code: 'C3', name: 'Pen', price: 50_00, mrp: 40_00, hsn: '9608', tax: 'GST 18%' },
			// a combined tax category is not one rate: an error
			{ line: 12, code: 'D4', name: 'Bag', price: 50_00, hsn: '4202', tax: 'GST 12 to 5%' }
		];
		const options = { stockMode: 'add' as const, newCategoryId: categoryId };

		const preview = await admin.query(api.store.admin.import.plan, { rows, options });
		expect(preview.rows.map((r) => r.status)).toEqual(['update', 'new', 'error', 'error']);

		await expect(
			admin.mutation(api.store.admin.import.apply, {
				rows,
				options,
				fingerprint: preview.fingerprint
			})
		).resolves.toEqual({ created: 1, updated: 1 });

		const { variant, log } = await read(t, variantId);
		expect(variant).toMatchObject({ price: 140_00, mrp: 200_00, stock: 8 });
		expect(log).toMatchObject([{ delta: 3, reason: 'import', by: admin.userId }]);
		const created = await t.run((ctx) =>
			ctx.db
				.query('productVariants')
				.withIndex('by_sku', (q) => q.eq('sku', 'B2'))
				.unique()
		);
		expect(created).toMatchObject({ price: 90_00, mrp: 90_00, stock: 4 });
		for (const sku of ['C3', 'D4']) {
			const none = await t.run((ctx) =>
				ctx.db
					.query('productVariants')
					.withIndex('by_sku', (q) => q.eq('sku', sku))
					.first()
			);
			expect(none).toBeNull();
		}
	});

	it('refuses to apply if the catalogue changed after the preview', async () => {
		const { t, admin } = await setup();
		const { variantId } = await seedBook(t, { stock: 5, sku: 'A1' });
		const rows = [{ line: 9, code: 'A1', stock: 7 }];
		const options = { stockMode: 'set' as const };
		const preview = await admin.query(api.store.admin.import.plan, { rows, options });
		await seedOrder(t, variantId, 'paid', 1); // an order lands between preview and apply

		await expect(
			admin.mutation(api.store.admin.import.apply, {
				rows,
				options,
				fingerprint: preview.fingerprint
			})
		).rejects.toThrow(/Preview the sheet again/);
		expect((await read(t, variantId)).variant.stock).toBe(5);
	});
});
