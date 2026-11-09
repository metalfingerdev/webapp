// Invoices: issued once when an order ships, numbered in sequence, frozen afterwards, and readable
// only by the shop's staff and the customer who owns the order.
import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import { setup } from './harness.testutils';
import type { OrderStatus } from './validators';

type T = Awaited<ReturnType<typeof setup>>['t'];

// An order of one exempt book (₹200) and one 18% item (₹118), under two different sets
const seedOrder = (t: T, userId: string, number: string, status: OrderStatus, placedAt: number) =>
	t.run(async (ctx) => {
		const categoryId =
			(await ctx.db.query('categories').first())?._id ??
			(await ctx.db.insert('categories', {
				name: 'Books',
				slug: 'books',
				sortOrder: 1,
				isActive: true
			}));
		const item = async (title: string, gstRate: 0 | 1800, price: number) => {
			const productId = await ctx.db.insert('products', {
				title,
				slug: `${title}-${number}`,
				categoryId,
				kind: 'book',
				hsn: '4901',
				gstRate,
				isActive: true,
				searchText: title
			});
			return {
				productId,
				variantId: await ctx.db.insert('productVariants', {
					productId,
					label: 'Default',
					mrp: price,
					price,
					stock: 5,
					lowStockAt: 1,
					sortOrder: 1,
					isActive: true
				})
			};
		};
		const book = await item('Maths 1', 0, 200_00);
		const folder = await item('Folder', 1800, 118_00);
		const orderId = await ctx.db.insert('orders', {
			userId,
			number,
			status,
			paymentStatus: 'pending',
			address: {
				name: 'Parent',
				phone: '+919876543210', // allow-identifier: made-up test number
				line1: '1 Test Road',
				city: 'Faridabad',
				state: 'Haryana',
				pincode: '121001'
			},
			paymentMethod: 'cod',
			zoneName: 'Local',
			deliveryMethod: 'local',
			subtotal: 318_00,
			shippingFee: 40_00,
			total: 358_00,
			placedAt
		});
		await ctx.db.insert('orderItems', {
			orderId,
			...book,
			title: 'Maths 1',
			hsn: '4901',
			gstRate: 0,
			unitPrice: 200_00,
			quantity: 1,
			setLabel: 'Test School · Class 1 books'
		});
		await ctx.db.insert('orderItems', {
			orderId,
			...folder,
			title: 'Folder',
			hsn: '4820',
			gstRate: 1800,
			unitPrice: 118_00,
			quantity: 1
		});
	});

const seedSettings = (t: T) =>
	t.run((ctx) =>
		ctx.db.insert('storeSettings', {
			businessName: 'Test Shop',
			legalName: 'Test Traders',
			invoicePrefix: 'TT',
			returnWindowDays: 7,
			currentSession: '2026-27',
			placedOrdersOpen: true
		})
	);

describe('invoices', () => {
	it('is issued when the order ships, never before, and numbers run in sequence', async () => {
		const { t, admin, customer } = await setup();
		await seedSettings(t);
		await seedOrder(t, customer.userId, 'AK-TEST0001', 'packed', 1);
		await seedOrder(t, customer.userId, 'AK-TEST0002', 'packed', 2);

		expect(await admin.query(api.store.admin.documents.invoice, { number: 'AK-TEST0001' })).toBe(
			null
		);
		await admin.mutation(api.store.admin.orders.markShipped, { number: 'AK-TEST0002' });
		await admin.mutation(api.store.admin.orders.markShipped, { number: 'AK-TEST0001' });
		// Shipping again changes nothing and takes no number
		await admin.mutation(api.store.admin.orders.markShipped, { number: 'AK-TEST0001' });

		const first = await admin.query(api.store.admin.documents.invoice, { number: 'AK-TEST0001' });
		const second = await admin.query(api.store.admin.documents.invoice, { number: 'AK-TEST0002' });
		expect(second?.number).toMatch(/^TT\/\d{2}-\d{2}\/0001$/);
		expect(first?.number).toMatch(/^TT\/\d{2}-\d{2}\/0002$/);
		const counters = await t.run((ctx) => ctx.db.query('invoiceCounters').take(5));
		expect(counters.map((c) => c.next)).toEqual([3]);
	});

	it("adds the tax back to the order's subtotal and groups lines by set", async () => {
		const { t, admin, customer } = await setup();
		await seedSettings(t);
		await seedOrder(t, customer.userId, 'AK-TEST0001', 'packed', 1);
		await admin.mutation(api.store.admin.orders.markShipped, { number: 'AK-TEST0001' });

		const doc = await customer.query(api.store.orders.invoiceDocument, { number: 'AK-TEST0001' });
		expect(doc).not.toBeNull();
		// ₹118 at 18% holds ₹18 of tax; the ₹200 book is exempt
		expect(doc!.taxByRate).toEqual([
			{ gstRate: 0, taxable: 200_00, tax: 0 },
			{ gstRate: 1800, taxable: 100_00, tax: 18_00 }
		]);
		const inclusive = doc!.taxByRate.reduce((sum, row) => sum + row.taxable + row.tax, 0);
		expect(inclusive).toBe(doc!.subtotal);
		expect(doc!.total).toBe(doc!.subtotal + doc!.shippingFee);
		expect(doc!.groups.map((g) => g.label)).toEqual(['Test School · Class 1 books', undefined]);
	});

	it('keeps the seller as it was when issued, whatever the settings say later', async () => {
		const { t, admin, customer } = await setup();
		const settingsId = await seedSettings(t);
		await seedOrder(t, customer.userId, 'AK-TEST0001', 'packed', 1);
		await admin.mutation(api.store.admin.orders.markShipped, { number: 'AK-TEST0001' });
		await t.run((ctx) => ctx.db.patch('storeSettings', settingsId, { legalName: 'Someone Else' }));

		const doc = await admin.query(api.store.admin.documents.invoice, { number: 'AK-TEST0001' });
		expect(doc!.seller.name).toBe('Test Traders');
	});
});

describe('document access', () => {
	it('refuses signed-out callers and customers on the staff functions', async () => {
		const { t, signedOut, customer } = await setup();
		await seedOrder(t, customer.userId, 'AK-TEST0001', 'paid', 1);
		for (const caller of [signedOut, customer]) {
			const calls = [
				() => caller.query(api.store.admin.documents.invoice, { number: 'AK-TEST0001' }),
				() => caller.query(api.store.admin.documents.packingSlip, { number: 'AK-TEST0001' }),
				() => caller.query(api.store.admin.documents.packingSlipsToPack, {})
			];
			for (const call of calls) await expect(call()).rejects.toThrow(/Not authenticated|Forbidden/);
		}
	});

	it("answers another customer's invoice exactly as it answers an order that does not exist", async () => {
		const { t, admin, customer, otherCustomer } = await setup();
		await seedOrder(t, customer.userId, 'AK-TEST0001', 'packed', 1);
		await admin.mutation(api.store.admin.orders.markShipped, { number: 'AK-TEST0001' });

		const stranger = otherCustomer.query(api.store.orders.invoiceDocument, {
			number: 'AK-TEST0001'
		});
		const missing = otherCustomer.query(api.store.orders.invoiceDocument, {
			number: 'AK-NOSUCH01'
		});
		await expect(stranger).rejects.toThrow('Order not found');
		await expect(missing).rejects.toThrow('Order not found');
	});
});

describe('packing slips', () => {
	it('covers the orders waiting to be packed, oldest first, and no cancelled order', async () => {
		const { t, admin, customer } = await setup();
		await seedOrder(t, customer.userId, 'AK-TEST0002', 'confirmed', 2);
		await seedOrder(t, customer.userId, 'AK-TEST0001', 'paid', 1);
		await seedOrder(t, customer.userId, 'AK-TEST0003', 'packed', 3);
		await seedOrder(t, customer.userId, 'AK-TEST0004', 'cancelled', 4);

		const slips = await admin.query(api.store.admin.documents.packingSlipsToPack, {});
		expect(slips.map((s) => s.orderNumber)).toEqual(['AK-TEST0001', 'AK-TEST0002']);
		await expect(
			admin.query(api.store.admin.documents.packingSlip, { number: 'AK-TEST0004' })
		).rejects.toThrow('cancelled');
	});
});
