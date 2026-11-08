// Money going back to a customer. A payment is refunded at most once: `startRefund` does nothing when
// the payment already has a refund, so a retried cancel or a repeated webhook never pays out twice.
import type { Doc } from '../../_generated/dataModel.js';
import type { MutationCtx } from '../../_generated/server.js';
import { internal } from '../../_generated/api.js';
import type { Infer } from 'convex/values';
import type { refundStatus } from '../../store/validators.js';

/** Marks the payment and its order as refunding and asks the gateway (store/payments.ts#sendRefund) */
export const startRefund = async (ctx: MutationCtx, payment: Doc<'payments'>) => {
	if (payment.refund || payment.status !== 'paid' || !payment.gatewayPaymentId) return false;
	const refund = { amount: payment.amount, at: Date.now(), status: 'pending' as const };
	await ctx.db.patch('payments', payment._id, { refund });
	await ctx.db.patch('orders', payment.orderId, { refund });
	await ctx.scheduler.runAfter(0, internal.store.payments.sendRefund, { paymentId: payment._id });
	return true;
};

/** Records what the gateway said about a refund; a processed refund marks the order refunded */
export const applyRefund = async (
	ctx: MutationCtx,
	payment: Doc<'payments'>,
	update: { status: Infer<typeof refundStatus>; gatewayRefundId?: string }
) => {
	if (!payment.refund || payment.refund.status === 'processed') return;
	const refund = {
		...payment.refund,
		status: update.status,
		gatewayRefundId: update.gatewayRefundId ?? payment.refund.gatewayRefundId
	};
	const processed = update.status === 'processed';
	await ctx.db.patch('payments', payment._id, {
		refund,
		...(processed ? { status: 'refunded' as const } : {})
	});
	await ctx.db.patch('orders', payment.orderId, {
		refund,
		...(processed ? { paymentStatus: 'refunded' as const } : {})
	});
};
