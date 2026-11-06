// src/lib/razorpay/convex-payment-processor.ts
import type { Id } from '$convex/_generated/dataModel.js';
import type { PaymentProcessor, PaymentReceipt } from './payment-processor.js';

// Type alias representing the signature of the generated Convex action
// FIX 1: Removed 'amount' because the backend action only takes 'orderId'
export type CreatePaymentActionSignature = (args: {
	orderId: Id<'orders'>;
}) => Promise<{ id: string; amount: number; currency: string }>;

export class ConvexPaymentProcessor implements PaymentProcessor {
	// Inject the Convex action function directly via the constructor
	constructor(private createPaymentOrder: CreatePaymentActionSignature) {}

	// FIX 2: Renamed 'amount' to '_amount' to satisfy the interface while avoiding ESLint "unused variable" errors
	async charge(orderId: Id<'orders'>): Promise<PaymentReceipt> {
		// FIX 3: Cleaned up the broken syntax to pass just the object payload
		const result = await this.createPaymentOrder({ orderId });

		return {
			id: result.id,
			status: 'paid',
			amount: result.amount,
			currency: result.currency
		};
	}
}
