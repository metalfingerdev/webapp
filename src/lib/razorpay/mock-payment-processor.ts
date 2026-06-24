// src/lib/razorpay/mock-payment-processor.ts
import type { Id } from '$convex/_generated/dataModel.js';
import type { PaymentProcessor, PaymentReceipt } from './payment-processor.js';
import { requestUserPayment } from './gateway.svelte.js';

export type ChargeAction = (args: {
	orderId: Id<'orders'>;
}) => Promise<{ id: string; amount: number; currency: string }>;

export class MockPaymentProcessor implements PaymentProcessor {
	constructor(private chargeAction: ChargeAction) {}

	async charge(orderId: Id<'orders'>, amount: number): Promise<PaymentReceipt> {
		console.log(`[Razorpay Mock] 💳 Opening gateway for order ${orderId}...`);

		try {
			await requestUserPayment(amount);

			// Call backend action with the verified orderId context
			const result = await this.chargeAction({ orderId });

			return {
				id: result.id,
				status: 'paid',
				amount: result.amount,
				currency: result.currency
			};
		} catch (backendError) {
			console.error('[Razorpay Mock] ❌ Checkout aborted or failed:', backendError);
			throw backendError;
		}
	}
}
