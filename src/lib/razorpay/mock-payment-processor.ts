// src/lib/razorpay/mock-payment-processor.ts
import type { Id } from '$convex/_generated/dataModel.js';
import type { PaymentProcessor, PaymentReceipt } from './payment-processor.js';
import { requestUserPayment, openGatewayLoading, closeGateway } from './gateway.svelte.js';

export type ChargeAction = (args: {
	orderId: Id<'orders'>;
}) => Promise<{ id: string; amount: number; currency: string }>;

export class MockPaymentProcessor implements PaymentProcessor {
	constructor(private chargeAction: ChargeAction) {}

	async charge(orderId: Id<'orders'>): Promise<PaymentReceipt> {
		console.log(`[Razorpay Mock] 💳 Creating payment order for ${orderId}...`);

		// Show the gateway immediately in a loading state while the server
		// prepares the payment order — avoids a flash of ₹0.00 before the amount lands.
		openGatewayLoading();

		try {
			// 1. Server creates the payment order. The amount is authoritative —
			//    derived from the order total computed server-side, never the client cart.
			const result = await this.chargeAction({ orderId });

			// 2. Swap the loading state for the real gateway using the SERVER amount.
			//    The client-side total is for display in the cart only and is never charged.
			await requestUserPayment(result.amount);

			return {
				id: result.id,
				status: 'paid',
				amount: result.amount,
				currency: result.currency
			};
		} catch (backendError) {
			console.error('[Razorpay Mock] ❌ Checkout aborted or failed:', backendError);
			// Ensure the loading panel doesn't stay stuck open if the server call failed.
			closeGateway(false);
			throw backendError;
		}
	}
}
