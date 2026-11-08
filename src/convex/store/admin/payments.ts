// Admin: is online payment set up on this deployment, and what happened to each payment. The
// screens come with the admin in step 7.
import { v } from 'convex/values';
import { query } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { missingRazorpayEnv } from '../../model/store/razorpay.js';
import { gatewayPaymentStatus, refund } from '../validators.js';

/** Which Razorpay env vars are missing (names only, never values) and the webhook address to give Razorpay */
export const checkSetup = query({
	args: {},
	returns: v.object({ missing: v.array(v.string()), webhookUrl: v.string() }),
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		return {
			missing: missingRazorpayEnv(),
			webhookUrl: `${process.env.CONVEX_SITE_URL ?? ''}/razorpay-webhook`
		};
	}
});

/** The latest payments, newest first, with their refund state */
export const list = query({
	args: {},
	returns: v.array(
		v.object({
			orderNumber: v.string(),
			amount: v.number(),
			status: gatewayPaymentStatus,
			gatewayPaymentId: v.optional(v.string()),
			refund: v.optional(refund),
			createdAt: v.number()
		})
	),
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const payments = await ctx.db
			.query('payments')
			.withIndex('by_createdAt')
			.order('desc')
			.take(100);
		const rows = [];
		for (const payment of payments) {
			const order = await ctx.db.get('orders', payment.orderId);
			rows.push({
				orderNumber: order?.number ?? '',
				amount: payment.amount,
				status: payment.status,
				gatewayPaymentId: payment.gatewayPaymentId,
				refund: payment.refund,
				createdAt: payment.createdAt
			});
		}
		return rows;
	}
});
