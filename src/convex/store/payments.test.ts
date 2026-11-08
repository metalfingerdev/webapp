// Online payment: only a signed gateway message marks an order paid, the amount must be the order's,
// and money goes back exactly once. Each test fails if one of those breaks.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { signForTest } from '../model/store/razorpay';
import { setup } from './harness.testutils';

const fakes = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock('../model/store/rateLimits', () => ({ orderRateLimiter: { limit: fakes.limit } }));

const WEBHOOK_SECRET = 'test-webhook-secret';
beforeEach(() => {
	// Fake timers keep scheduled jobs (refunds, expiry) from running on their own
	vi.useFakeTimers();
	fakes.limit.mockReset().mockResolvedValue(undefined);
	process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
	process.env.RAZORPAY_KEY_SECRET = 'test-key-secret';
	process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});
afterEach(() => {
	vi.useRealTimers();
	delete process.env.RAZORPAY_KEY_ID;
	delete process.env.RAZORPAY_KEY_SECRET;
	delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

/** A customer with an unpaid online order of 2 × ₹150 + ₹79 delivery, and its gateway order */
const onlineOrder = async () => {
	const world = await setup();
	const variantId = await world.t.run(async (ctx) => {
		await ctx.db.insert('storeSettings', {
			businessName: 'Test',
			returnWindowDays: 7,
			currentSession: '2026-27',
			placedOrdersOpen: true
		});
		await ctx.db.insert('deliveryZones', {
			name: 'Elsewhere',
			method: 'courier',
			fee: 7900,
			freeFrom: 99900,
			estimate: 'later',
			isFallback: true,
			isActive: true,
			sortOrder: 1
		});
		const categoryId = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const productId = await ctx.db.insert('products', {
			title: 'Book',
			slug: 'book',
			categoryId,
			kind: 'book',
			hsn: '4901',
			gstRate: 0,
			isActive: true,
			searchText: 'book'
		});
		return ctx.db.insert('productVariants', {
			productId,
			label: 'Default',
			mrp: 20000,
			price: 15000,
			stock: 10,
			lowStockAt: 2,
			sortOrder: 0,
			isActive: true
		});
	});
	await world.customer.mutation(api.store.cart.setLines, { lines: [{ variantId, quantity: 2 }] });
	const addressId = await world.customer.mutation(api.store.addresses.save, {
		name: 'Test Parent',
		phone: '9876543210', // allow-identifier: made-up test number
		line1: '1 Test Road',
		city: 'Testville',
		state: 'Haryana',
		pincode: '560001',
		makeDefault: true
	});
	const { number } = await world.customer.mutation(api.store.orders.placeOrder, {
		addressId,
		paymentMethod: 'online'
	});
	// What start() saves once Razorpay answers (the test does not call Razorpay)
	const orderId = await world.t.run(async (ctx) => {
		const order = await ctx.db
			.query('orders')
			.withIndex('by_number', (q) => q.eq('number', number))
			.unique();
		await ctx.db.insert('payments', {
			orderId: order!._id,
			gatewayOrderId: 'order_test',
			amount: order!.total,
			status: 'created',
			createdAt: Date.now()
		});
		return order!._id;
	});

	const capture = async (eventId: string, amount = 37900, signature?: string) => {
		const body = JSON.stringify({
			event: 'payment.captured',
			payload: { payment: { entity: { id: 'pay_test', order_id: 'order_test', amount } } }
		});
		return world.t.fetch('/razorpay-webhook', {
			method: 'POST',
			headers: {
				'x-razorpay-signature': signature ?? (await signForTest(WEBHOOK_SECRET, body)),
				'x-razorpay-event-id': eventId
			},
			body
		});
	};
	const order = () => world.t.run(async (ctx) => (await ctx.db.get('orders', orderId))!);
	const stock = () =>
		world.t.run(async (ctx) => (await ctx.db.get('productVariants', variantId))!.stock);
	const refundsScheduled = () =>
		world.t.run(
			async (ctx) =>
				(await ctx.db.system.query('_scheduled_functions').collect()).filter((job) =>
					job.name.includes('sendRefund')
				).length
		);
	const expire = (id: Id<'orders'> = orderId) =>
		world.t.mutation(internal.store.payments.expire, { orderId: id });
	return { ...world, number, capture, order, stock, refundsScheduled, expire };
};

describe('online payment', () => {
	it('refuses a webhook with a bad signature, and marks the order paid once with a good one', async () => {
		const w = await onlineOrder();
		expect((await w.order()).status).toBe('awaiting_payment');

		const forged = await w.capture('evt_1', 37900, 'not-the-signature');
		expect(forged.status).toBe(401);
		expect((await w.order()).status).toBe('awaiting_payment');

		expect((await w.capture('evt_1')).status).toBe(200);
		expect(await w.order()).toMatchObject({ status: 'paid', paymentStatus: 'paid' });
		// The same event resent, and a second event for the same capture, change nothing
		await w.capture('evt_1');
		await w.capture('evt_2');
		expect(await w.order()).toMatchObject({ status: 'paid', paymentStatus: 'paid' });
		expect(await w.refundsScheduled()).toBe(0);
	});

	it('ignores a capture for a different amount than the order', async () => {
		const w = await onlineOrder();
		expect((await w.capture('evt_1', 100)).status).toBe(200);
		expect(await w.order()).toMatchObject({ status: 'awaiting_payment', paymentStatus: 'pending' });
	});

	it('cancels an unpaid order after the window, releases its stock, and refunds late money once', async () => {
		const w = await onlineOrder();
		expect(await w.stock()).toBe(8);
		await w.expire();
		expect((await w.order()).status).toBe('cancelled');
		expect(await w.stock()).toBe(10);

		await w.capture('evt_1');
		await w.capture('evt_2');
		expect((await w.order()).status).toBe('cancelled');
		expect((await w.order()).refund).toMatchObject({ amount: 37900, status: 'pending' });
		expect(await w.refundsScheduled()).toBe(1);
	});

	it('refunds a paid order once when it is cancelled twice, and expiry leaves it alone', async () => {
		const w = await onlineOrder();
		await w.capture('evt_1');
		await w.expire();
		expect((await w.order()).status).toBe('paid');

		await w.customer.mutation(api.store.orders.cancelOrder, { number: w.number });
		await w.customer.mutation(api.store.orders.cancelOrder, { number: w.number });
		expect((await w.order()).status).toBe('cancelled');
		expect(await w.stock()).toBe(10);
		expect(await w.refundsScheduled()).toBe(1);
	});
});
