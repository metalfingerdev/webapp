// What happens when the gateway says money was taken. Shared by the webhook and the return check
// (store/payments.ts), so both reach the same answer and the second one to arrive changes nothing.
import type { MutationCtx } from '../../_generated/server.js';
import { transitionOrder } from './orders.js';
import { startRefund } from './refunds.js';
import { PAYMENT_GRACE_MINUTES, PAYMENT_WINDOW_MINUTES } from './storeProfile.js';

const MINUTE = 60_000;
export const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * MINUTE;
/** When an unpaid order is cancelled: the window plus a short grace */
export const PAYMENT_EXPIRY_MS = (PAYMENT_WINDOW_MINUTES + PAYMENT_GRACE_MINUTES) * MINUTE;

export type CaptureOutcome = 'paid' | 'already' | 'refunding' | 'mismatch' | 'unknown';

/**
 * The gateway captured `amount` paise for `gatewayOrderId`. Marks the order paid if it is still
 * waiting. Money for an order that was cancelled meanwhile, or already paid, goes back.
 */
export const settleCapture = async (
	ctx: MutationCtx,
	capture: { gatewayOrderId: string; gatewayPaymentId: string; amount: number }
): Promise<CaptureOutcome> => {
	const payment = await ctx.db
		.query('payments')
		.withIndex('by_gatewayOrderId', (q) => q.eq('gatewayOrderId', capture.gatewayOrderId))
		.first();
	if (!payment) {
		console.warn(`Capture for an unknown gateway order ${capture.gatewayOrderId}`);
		return 'unknown';
	}
	if (payment.status === 'paid' || payment.status === 'refunded') return 'already';
	if (capture.amount !== payment.amount) {
		console.error(
			`Capture of ${capture.amount} paise for payment ${payment._id}, which expected ${payment.amount}`
		);
		return 'mismatch';
	}
	await ctx.db.patch('payments', payment._id, {
		status: 'paid',
		gatewayPaymentId: capture.gatewayPaymentId
	});

	const order = await ctx.db.get('orders', payment.orderId);
	if (order?.status === 'awaiting_payment') {
		await transitionOrder(ctx, order._id, 'paid', 'system');
		return 'paid';
	}
	// Late money (the window ran out) or a second payment for a paid order: it is returned
	await startRefund(ctx, { ...payment, status: 'paid', gatewayPaymentId: capture.gatewayPaymentId });
	return 'refunding';
};
