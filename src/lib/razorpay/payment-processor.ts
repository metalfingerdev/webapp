// src/lib/razorpay/payment-processor.ts
import type { Id } from '$convex/_generated/dataModel.js';

export interface PaymentReceipt {
	id: string;
	status: 'paid' | 'failed';
	amount: number;
	currency: string;
}

export interface PaymentProcessor {
	charge(orderId: Id<'orders'>, amount: number): Promise<PaymentReceipt>;
}
