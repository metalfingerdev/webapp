// src/lib/cart/checkout.ts
import type { Id } from '$convex/_generated/dataModel.js';
import type { CartItem } from './types.js';
import type { PaymentProcessor } from '$lib/razorpay/payment-processor.js';

export interface CheckoutDependencies {
	items: CartItem[];
	total: number;
	addressId: Id<'addresses'>;
	processor: PaymentProcessor; // Added missing dependency
	mutations: {
		validateStock: (args: {
			items: { id: Id<'products'>; name: string; quantity: number }[];
		}) => Promise<void | null>;
		createOrder: (args: {
			items: { productId: Id<'products'>; quantity: number }[];
			addressId: Id<'addresses'>;
		}) => Promise<Id<'orders'>>;
		confirmOrder: (args: { orderId: Id<'orders'>; paymentId: string }) => Promise<void | null>;
	};
	onReadyForPayment?: () => void;
}

export async function processCheckout(deps: CheckoutDependencies): Promise<Id<'orders'>> {
	await deps.mutations.validateStock({
		items: deps.items.map((i) => ({
			id: i.productId,
			name: i.name,
			quantity: i.quantity
		}))
	});

	const orderId = await deps.mutations.createOrder({
		items: deps.items.map((i) => ({
			productId: i.productId,
			quantity: i.quantity
		})),
		addressId: deps.addressId
	});

	deps.onReadyForPayment?.();

	// Pass orderId to the processor instead of just total amount
	const receipt = await deps.processor.charge(orderId, deps.total);

	await deps.mutations.confirmOrder({ orderId, paymentId: receipt.id });

	return orderId;
}
