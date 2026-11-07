// Checkout and orders: the order charges what the database says, holds the shelf exactly once, and
// belongs to one customer. Each test fails if one of those breaks.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../_generated/api';
import { setup } from './harness.testutils';

const fakes = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock('../model/store/rateLimits', () => ({ orderRateLimiter: { limit: fakes.limit } }));
beforeEach(() => fakes.limit.mockReset().mockResolvedValue(undefined));

const address = (pincode: string) => ({
	name: 'Test Parent',
	phone: '9876543210', // allow-identifier: made-up test number
	line1: '1 Test Road',
	city: 'Testville',
	state: 'Haryana',
	pincode,
	makeDefault: true
});

const seed = async () => {
	const world = await setup();
	const ids = await world.t.run(async (ctx) => {
		await ctx.db.insert('storeSettings', {
			businessName: 'Test',
			returnWindowDays: 7,
			currentSession: '2026-27',
			placedOrdersOpen: true
		});
		const local = await ctx.db.insert('deliveryZones', {
			name: 'Local',
			method: 'local',
			fee: 4000,
			freeFrom: 50000,
			estimate: 'soon',
			isFallback: false,
			isActive: true,
			sortOrder: 1
		});
		await ctx.db.insert('zonePincodes', { zoneId: local, pincode: '121001' });
		await ctx.db.insert('deliveryZones', {
			name: 'Elsewhere',
			method: 'courier',
			fee: 7900,
			freeFrom: 99900,
			estimate: 'later',
			isFallback: true,
			isActive: true,
			sortOrder: 2
		});
		const categoryId = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const variant = async (title: string, stock: number) => {
			const productId = await ctx.db.insert('products', {
				title,
				slug: title,
				categoryId,
				kind: 'book',
				hsn: '4901',
				gstRate: 0,
				isActive: true,
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
		return { plenty: await variant('plenty', 100), scarce: await variant('scarce', 3) };
	});
	const stockOf = (id: typeof ids.plenty) =>
		world.t.run(async (ctx) => (await ctx.db.get('productVariants', id))!.stock);
	return { ...world, ids, stockOf };
};

const checkoutWith = async (
	world: Awaited<ReturnType<typeof seed>>,
	pincode = '121001',
	lines = [{ variantId: world.ids.plenty as string, quantity: 2 }]
) => {
	await world.customer.mutation(api.store.cart.setLines, { lines });
	const addressId = await world.customer.mutation(api.store.addresses.save, address(pincode));
	return addressId;
};

describe('orders', () => {
	it('refuses a signed-out caller', async () => {
		const { signedOut } = await seed();
		await expect(signedOut.query(api.store.orders.myOrders, {})).rejects.toThrow();
		await expect(signedOut.query(api.store.addresses.list, {})).rejects.toThrow();
		await expect(
			signedOut.mutation(api.store.orders.cancelOrder, { number: 'AK-X' })
		).rejects.toThrow();
	});

	it('charges the database price plus the zone fee, holds stock once and empties the cart', async () => {
		const world = await seed();
		const addressId = await checkoutWith(world);
		const { number } = await world.customer.mutation(api.store.orders.placeOrder, {
			addressId,
			paymentMethod: 'cod'
		});
		const order = await world.customer.query(api.store.orders.getOrder, { number });
		expect(order).toMatchObject({
			status: 'confirmed',
			paymentMethod: 'cod',
			zoneName: 'Local',
			subtotal: 30000,
			shippingFee: 4000,
			total: 34000
		});
		expect(await world.stockOf(world.ids.plenty)).toBe(98);
		// Each customer is limited on their own key
		expect(fakes.limit).toHaveBeenCalledWith(expect.anything(), 'placeOrder', {
			key: world.customer.userId,
			throws: true
		});
		const log = await world.t.run((ctx) => ctx.db.query('stockAdjustments').collect());
		expect(log.filter((row) => row.reason === 'order')).toHaveLength(1);
		expect((await world.customer.query(api.store.cart.getCart, {})).lines).toEqual([]);
	});

	it('uses the fallback zone for a pincode no zone lists', async () => {
		const world = await seed();
		const addressId = await checkoutWith(world, '560001');
		const { number } = await world.customer.mutation(api.store.orders.placeOrder, {
			addressId,
			paymentMethod: 'cod'
		});
		const order = await world.customer.query(api.store.orders.getOrder, { number });
		expect(order).toMatchObject({
			zoneName: 'Elsewhere',
			deliveryMethod: 'courier',
			shippingFee: 7900
		});
	});

	it('refuses the whole order when the shelf cannot cover it, holding nothing', async () => {
		const world = await seed();
		const addressId = await checkoutWith(world, '121001', [
			{ variantId: world.ids.plenty, quantity: 1 },
			{ variantId: world.ids.scarce, quantity: 3 }
		]);
		await world.t.run((ctx) => ctx.db.patch('productVariants', world.ids.scarce, { stock: 1 }));
		await expect(
			world.customer.mutation(api.store.orders.placeOrder, { addressId, paymentMethod: 'cod' })
		).rejects.toThrow(/only 1 left/);
		expect(await world.stockOf(world.ids.plenty)).toBe(100);
		expect(await world.t.run((ctx) => ctx.db.query('orders').first())).toBeNull();
	});

	it('refuses online payment until the gateway exists', async () => {
		const world = await seed();
		const addressId = await checkoutWith(world);
		await expect(
			world.customer.mutation(api.store.orders.placeOrder, { addressId, paymentMethod: 'online' })
		).rejects.toThrow(/not available yet/);
		expect(await world.stockOf(world.ids.plenty)).toBe(100);
	});

	it("keeps one customer's addresses and orders away from another", async () => {
		const world = await seed();
		const addressId = await checkoutWith(world);
		await expect(
			world.otherCustomer.mutation(api.store.orders.placeOrder, { addressId, paymentMethod: 'cod' })
		).rejects.toThrow(/Address not found/);
		const { number } = await world.customer.mutation(api.store.orders.placeOrder, {
			addressId,
			paymentMethod: 'cod'
		});
		await expect(world.otherCustomer.query(api.store.orders.getOrder, { number })).rejects.toThrow(
			/Order not found/
		);
		await expect(
			world.otherCustomer.mutation(api.store.orders.cancelOrder, { number })
		).rejects.toThrow(/Order not found/);
	});

	it('puts the stock back once when cancelled twice, and refuses once it has shipped', async () => {
		const world = await seed();
		const addressId = await checkoutWith(world);
		const { number } = await world.customer.mutation(api.store.orders.placeOrder, {
			addressId,
			paymentMethod: 'cod'
		});
		await world.customer.mutation(api.store.orders.cancelOrder, { number });
		await world.customer.mutation(api.store.orders.cancelOrder, { number });
		expect(await world.stockOf(world.ids.plenty)).toBe(100);

		const second = await world.customer.mutation(api.store.orders.placeOrder, {
			addressId: await checkoutWith(world),
			paymentMethod: 'cod'
		});
		await world.t.run(async (ctx) => {
			const order = await ctx.db
				.query('orders')
				.withIndex('by_number', (q) => q.eq('number', second.number))
				.unique();
			await ctx.db.patch('orders', order!._id, { status: 'shipped' });
		});
		await expect(
			world.customer.mutation(api.store.orders.cancelOrder, { number: second.number })
		).rejects.toThrow(/left us/);
	});

	it('takes a return request only after delivery and inside the window', async () => {
		const world = await seed();
		const addressId = await checkoutWith(world);
		const { number } = await world.customer.mutation(api.store.orders.placeOrder, {
			addressId,
			paymentMethod: 'cod'
		});
		const ask = () =>
			world.customer.mutation(api.store.orders.requestReturn, { number, reason: 'Wrong edition' });
		await expect(ask()).rejects.toThrow(/cannot be requested/);

		const deliver = (daysAgo: number) =>
			world.t.run(async (ctx) => {
				const order = await ctx.db
					.query('orders')
					.withIndex('by_number', (q) => q.eq('number', number))
					.unique();
				await ctx.db.patch('orders', order!._id, {
					status: 'delivered',
					deliveredAt: Date.now() - daysAgo * 24 * 60 * 60 * 1000
				});
			});
		await deliver(8);
		await expect(ask()).rejects.toThrow(/cannot be requested/);
		await deliver(2);
		await ask();
		expect(
			(await world.customer.query(api.store.orders.getOrder, { number })).returnRequest
		).toMatchObject({
			reason: 'Wrong edition',
			status: 'requested'
		});
		await expect(ask()).rejects.toThrow(/cannot be requested/);
	});
});
