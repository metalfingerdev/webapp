// The one place an order's status changes. It checks the move is allowed, writes the timestamp and
// does the side effect (put the held stock back on a cancel, settle cash on delivery). Asking for the
// status the order already has does nothing, so a retried call never double-releases stock.
import { ConvexError } from 'convex/values';
import type { Doc } from '../../_generated/dataModel.js';
import type { MutationCtx } from '../../_generated/server.js';
import type { OrderStatus } from '../../store/validators.js';
import { adjustStock } from './stock.js';

const MOVES: Record<OrderStatus, OrderStatus[]> = {
	awaiting_payment: ['paid', 'cancelled'],
	confirmed: ['packed', 'cancelled'],
	paid: ['packed', 'cancelled'],
	packed: ['shipped', 'cancelled'],
	shipped: ['delivered'], // once it has left, the customer returns it instead
	delivered: [],
	cancelled: []
};

/** A customer may cancel until the order ships (dictated 2026-11-07) */
export const canCancel = (status: OrderStatus) => MOVES[status].includes('cancelled');

const STAMP: Partial<Record<OrderStatus, keyof Doc<'orders'>>> = {
	paid: 'paidAt',
	packed: 'packedAt',
	shipped: 'shippedAt',
	delivered: 'deliveredAt',
	cancelled: 'cancelledAt'
};

export const transitionOrder = async (
	ctx: MutationCtx,
	orderId: Doc<'orders'>['_id'],
	to: OrderStatus,
	by: string
) => {
	const order = await ctx.db.get('orders', orderId);
	if (!order) throw new ConvexError('Order not found');
	if (order.status === to) return;
	if (!MOVES[order.status].includes(to)) {
		throw new ConvexError(`An order that is ${order.status} cannot become ${to}`);
	}

	const now = Date.now();
	const patch: Partial<Doc<'orders'>> = { status: to };
	const stamp = STAMP[to];
	if (stamp) (patch as Record<string, number>)[stamp] = now;
	// Cash on delivery is paid when it arrives
	if (to === 'delivered' && order.paymentMethod === 'cod') {
		patch.paymentStatus = 'paid';
		patch.paidAt = now;
	}
	await ctx.db.patch('orders', order._id, patch);

	if (to === 'cancelled') {
		const items = await ctx.db
			.query('orderItems')
			.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
			.take(100);
		for (const item of items) {
			await adjustStock(ctx, {
				variantId: item.variantId,
				delta: item.quantity,
				reason: 'cancel',
				by,
				orderId: order._id
			});
		}
		// TODO (step 6): a paid online order is refunded here. Online orders cannot be placed yet.
	}
};
