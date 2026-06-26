import { describe, it, expect, vi } from 'vitest';
import { processCheckout, type CheckoutDependencies } from './checkout.js';
import type { CartItem } from './types.js';
import type { Id } from '$convex/_generated/dataModel.js';
import type { PaymentReceipt } from '$lib/razorpay/payment-processor.js';

// ---------------------------------------------------------------------------
// processCheckout orchestrates the order lifecycle:
//   validateStock → createOrder → processor.charge → confirmOrder
// It is dependency-injected, so we assert ordering, argument mapping, and
// failure short-circuiting with plain mocks.
// ---------------------------------------------------------------------------

const ORDER_ID = 'order_1' as Id<'orders'>;
const ADDRESS_ID = 'addr_1' as Id<'addresses'>;

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
	return {
		productId: 'prod_1' as Id<'products'>,
		name: 'Notebook',
		quantity: 2,
		price: 5000,
		stock: 10,
		category: 'stationary',
		...overrides
	};
}

function makeDeps(overrides: Partial<CheckoutDependencies> = {}): CheckoutDependencies {
	const receipt: PaymentReceipt = { id: 'pay_1', status: 'paid', amount: 10000, currency: 'INR' };
	return {
		items: [makeItem()],
		addressId: ADDRESS_ID,
		processor: { charge: vi.fn(async () => receipt) },
		mutations: {
			validateStock: vi.fn(async () => undefined),
			createOrder: vi.fn(async () => ORDER_ID),
			confirmOrder: vi.fn(async () => undefined)
		},
		...overrides
	};
}

describe('processCheckout', () => {
	it('runs validateStock → createOrder → charge → confirmOrder in order', async () => {
		const deps = makeDeps();

		await processCheckout(deps);

		const validate = (deps.mutations.validateStock as ReturnType<typeof vi.fn>).mock
			.invocationCallOrder[0];
		const create = (deps.mutations.createOrder as ReturnType<typeof vi.fn>).mock
			.invocationCallOrder[0];
		const charge = (deps.processor.charge as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
		const confirm = (deps.mutations.confirmOrder as ReturnType<typeof vi.fn>).mock
			.invocationCallOrder[0];

		expect(validate).toBeLessThan(create);
		expect(create).toBeLessThan(charge);
		expect(charge).toBeLessThan(confirm);
	});

	it('validates stock with id/name/quantity for every cart item', async () => {
		const deps = makeDeps({
			items: [
				makeItem({ productId: 'prod_a' as Id<'products'>, name: 'A', quantity: 1 }),
				makeItem({ productId: 'prod_b' as Id<'products'>, name: 'B', quantity: 3 })
			]
		});

		await processCheckout(deps);

		expect(deps.mutations.validateStock).toHaveBeenCalledWith({
			items: [
				{ id: 'prod_a', name: 'A', quantity: 1 },
				{ id: 'prod_b', name: 'B', quantity: 3 }
			]
		});
	});

	it('creates the order with productId/quantity and the chosen address', async () => {
		const deps = makeDeps({
			items: [makeItem({ productId: 'prod_x' as Id<'products'>, quantity: 4 })]
		});

		await processCheckout(deps);

		expect(deps.mutations.createOrder).toHaveBeenCalledWith({
			items: [{ productId: 'prod_x', quantity: 4 }],
			addressId: ADDRESS_ID
		});
	});

	it('charges the freshly created order and confirms it with the receipt id', async () => {
		const deps = makeDeps();

		const result = await processCheckout(deps);

		expect(deps.processor.charge).toHaveBeenCalledWith(ORDER_ID);
		expect(deps.mutations.confirmOrder).toHaveBeenCalledWith({
			orderId: ORDER_ID,
			paymentId: 'pay_1'
		});
		expect(result).toBe(ORDER_ID);
	});

	it('short-circuits without creating an order when stock validation fails', async () => {
		const deps = makeDeps({
			mutations: {
				validateStock: vi.fn(async () => {
					throw new Error('out of stock');
				}),
				createOrder: vi.fn(async () => ORDER_ID),
				confirmOrder: vi.fn(async () => undefined)
			}
		});

		await expect(processCheckout(deps)).rejects.toThrow('out of stock');
		expect(deps.mutations.createOrder).not.toHaveBeenCalled();
		expect(deps.processor.charge).not.toHaveBeenCalled();
		expect(deps.mutations.confirmOrder).not.toHaveBeenCalled();
	});

	it('does not confirm the order when the charge fails', async () => {
		const deps = makeDeps({
			processor: {
				charge: vi.fn(async () => {
					throw new Error('payment declined');
				})
			}
		});

		await expect(processCheckout(deps)).rejects.toThrow('payment declined');
		expect(deps.mutations.createOrder).toHaveBeenCalledOnce();
		expect(deps.mutations.confirmOrder).not.toHaveBeenCalled();
	});
});
