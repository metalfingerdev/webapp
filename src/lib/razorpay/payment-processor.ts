// src/lib/razorpay/payment-processor.ts
import type { Id } from '$convex/_generated/dataModel.js';

export interface PaymentReceipt {
	id: string;
	status: 'paid' | 'failed';
	amount: number;
	currency: string;
}

export interface PaymentProcessor {
	// Amount is intentionally NOT a parameter: the charge amount is resolved
	// server-side from the order (createPaymentOrder), never from the client cart.
	charge(orderId: Id<'orders'>): Promise<PaymentReceipt>;
}
