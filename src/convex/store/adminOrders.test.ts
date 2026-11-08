import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { setup } from './harness.testutils';
import type { OrderStatus } from './validators';

type T = Awaited<ReturnType<typeof setup>>['t'];

// One order for 2 of a book, in the given status. Stock is as if the order already holds its 2.
const seedOrder = (
	t: T,
	status: OrderStatus,
	opts: { deliveryMethod?: 'courier' | 'local'; paymentMethod?: 'cod' | 'online' } = {}
) =>
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
			mrp: 100_00,
			price: 100_00,
			stock: 3,
			lowStockAt: 1,
			sortOrder: 1,
			isActive: true
		});
		const orderId = await ctx.db.insert('orders', {
			userId: 'someone',
			number: 'AK-TEST0001',
			status,
			paymentStatus: 'pending',
			address: {
				name: 'Parent',
				phone: '+919876543210', // allow-identifier: made-up test number
				line1: 'x',
				city: 'Faridabad',
				state: 'Haryana',
				pincode: '121001'
			},
			paymentMethod: opts.paymentMethod ?? 'cod',
			zoneName: 'Test',
			deliveryMethod: opts.deliveryMethod ?? 'courier',
			subtotal: 200_00,
			shippingFee: 0,
			total: 200_00,
			placedAt: Date.now()
		});
		await ctx.db.insert('orderItems', {
			orderId,
			productId,
			variantId,
			title: 'Maths 1',
			hsn: '4901',
			gstRate: 0,
			unitPrice: 100_00,
			quantity: 2
		});
		return { orderId, variantId };
	});

const read = (t: T, orderId: Id<'orders'>, variantId: Id<'productVariants'>) =>
	t.run(async (ctx) => ({
		status: (await ctx.db.get('orders', orderId))!.status,
		stock: (await ctx.db.get('productVariants', variantId))!.stock,
		shipments: await ctx.db
			.query('shipments')
			.withIndex('by_orderId', (q) => q.eq('orderId', orderId))
			.take(5)
	}));

const number = 'AK-TEST0001';

describe('admin orders access', () => {
	it('refuses signed-out callers and customers, and changes nothing', async () => {
		const { t, signedOut, customer } = await setup();
		const { orderId, variantId } = await seedOrder(t, 'confirmed');

		for (const caller of [signedOut, customer]) {
			const calls = [
				() => caller.query(api.store.admin.orders.board, { dayStart: 0 }),
				() =>
					caller.query(api.store.admin.orders.list, {
						paginationOpts: { numItems: 10, cursor: null }
					}),
				() => caller.query(api.store.admin.orders.search, { q: 'Parent' }),
				() => caller.query(api.store.admin.orders.get, { number }),
				() => caller.mutation(api.store.admin.orders.markPacked, { number }),
				() =>
					caller.mutation(api.store.admin.orders.markShipped, {
						number,
						courier: 'DTDC',
						awb: 'D1234567'
					}),
				() => caller.mutation(api.store.admin.orders.markDelivered, { number }),
				() => caller.mutation(api.store.admin.orders.cancel, { number }),
				() => caller.mutation(api.store.admin.orders.answerReturn, { number, approve: true })
			];
			for (const call of calls) await expect(call()).rejects.toThrow(/Not authenticated|Forbidden/);
		}
		expect(await read(t, orderId, variantId)).toEqual({
			status: 'confirmed',
			stock: 3,
			shipments: []
		});
	});
});

describe('order moves', () => {
	it('will not pack an order that is still waiting for its payment', async () => {
		const { t, admin } = await setup();
		const { orderId, variantId } = await seedOrder(t, 'awaiting_payment', {
			paymentMethod: 'online'
		});
		await expect(admin.mutation(api.store.admin.orders.markPacked, { number })).rejects.toThrow(
			/cannot become packed/
		);
		expect((await read(t, orderId, variantId)).status).toBe('awaiting_payment');
	});

	it('ships a courier order once, only with a courier and AWB', async () => {
		const { t, admin } = await setup();
		const { orderId, variantId } = await seedOrder(t, 'packed');

		await expect(
			admin.mutation(api.store.admin.orders.markShipped, { number, courier: 'DTDC' })
		).rejects.toThrow(/AWB/);
		expect(await read(t, orderId, variantId)).toMatchObject({ status: 'packed', shipments: [] });

		await admin.mutation(api.store.admin.orders.markShipped, {
			number,
			courier: 'DTDC',
			awb: 'D1234567'
		});
		await admin.mutation(api.store.admin.orders.markShipped, {
			number,
			courier: 'Delhivery',
			awb: 'X9999999'
		});
		const after = await read(t, orderId, variantId);
		expect(after.status).toBe('shipped');
		expect(after.shipments).toMatchObject([{ courier: 'DTDC', awb: 'D1234567' }]);
	});

	it('sends a local order out for delivery without an AWB', async () => {
		const { t, admin } = await setup();
		const { orderId, variantId } = await seedOrder(t, 'packed', { deliveryMethod: 'local' });
		await admin.mutation(api.store.admin.orders.markShipped, { number });
		expect(await read(t, orderId, variantId)).toMatchObject({ status: 'shipped', shipments: [] });
	});

	it('cancelling puts the stock back once, even when repeated', async () => {
		const { t, admin } = await setup();
		const { orderId, variantId } = await seedOrder(t, 'paid');
		await admin.mutation(api.store.admin.orders.cancel, { number });
		await admin.mutation(api.store.admin.orders.cancel, { number });
		expect(await read(t, orderId, variantId)).toMatchObject({ status: 'cancelled', stock: 5 });
	});
});
