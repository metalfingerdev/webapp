// convex/orders.ts
import { v } from 'convex/values';
import { authComponent } from './auth.js';
import { loadSettings } from './lib/settings.js';
import { calculateOrder, type OrderLine } from './lib/pricing.js';
import { action, mutation, internalQuery, query } from './_generated/server.js';
import { internal } from './_generated/api.js';
import type { Id } from './_generated/dataModel.js';

export const createPaymentOrder = action({
	args: { orderId: v.id('orders') },
	handler: async (ctx, args): Promise<{ id: string; amount: number; currency: string }> => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');

		const order = await ctx.runQuery(internal.orders.getOrder, { orderId: args.orderId });
		if (!order) throw new Error('Order not found');
		if (order.userId !== user._id) throw new Error('Unauthorized');

		return {
			id: `order_mock_${Date.now()}`,
			amount: order.totalPrice,
			currency: 'INR'
		};
	}
});

export const getOrder = internalQuery({
	args: { orderId: v.id('orders') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.orderId);
	}
});

export const confirmOrder = mutation({
	args: {
		orderId: v.id('orders'),
		paymentId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');

		const order = await ctx.db.get(args.orderId);
		if (!order) throw new Error('Order not found');
		if (order.userId !== user._id) throw new Error('Unauthorized');
		if (order.status !== 'pending') throw new Error('Order is not in pending state');

		await ctx.db.patch(args.orderId, {
			status: 'confirmed',
			paymentId: args.paymentId
		});

		await ctx.db.insert('tracking', {
			orderId: args.orderId,
			status: 'order_placed',
			timestamp: Date.now(),
			message: 'Payment verified and order placed successfully.'
		});
	}
});

// convex/orders.ts
export const getOrderInvoice = query({
	args: { orderId: v.id('orders') },
	handler: async (ctx, args) => {
		const order = await ctx.db.get(args.orderId);
		if (!order) return null;

		const purchases = await ctx.db
			.query('purchases')
			.withIndex('by_orderId', (q) => q.eq('orderId', args.orderId))
			.collect();

		const lines = await Promise.all(
			purchases.map(async (p) => {
				const product = await ctx.db.get(p.productId);
				return { ...p, product };
			})
		);

		const address = await ctx.db.get(order.address);

		return { order, lines, address };
	}
});

export const createOrder = mutation({
	args: {
		items: v.array(
			v.object({
				productId: v.id('products'),
				quantity: v.number()
			})
		),
		addressId: v.id('addresses')
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');

		const s = await loadSettings(ctx.db);

		const lines: OrderLine[] = await Promise.all(
			args.items.map(async (item) => {
				const p = await ctx.db.get(item.productId);
				if (!p) throw new Error(`Product not found: ${item.productId}`);
				if (p.stock < item.quantity)
					throw new Error(
						`Insufficient stock for "${p.name}". Requested ${item.quantity}, only ${p.stock} left.`
					);
				return {
					productId: item.productId,
					name: p.name,
					hsnCode: p.hsnCode,
					taxCategory: p.taxCategory,
					quantity: item.quantity,
					unitPrice: p.salePrice,
					weight: p.weight
				};
			})
		);

		const totalWeight = lines.reduce((sum, l) => sum + (l.weight ?? 0) * l.quantity, 0);
		const totals = calculateOrder(lines, totalWeight, s);

		await Promise.all(
			args.items.map(async (item) => {
				const p = await ctx.db.get(item.productId);
				await ctx.db.patch(item.productId, { stock: p!.stock - item.quantity });
			})
		);

		const orderId = await ctx.db.insert('orders', {
			userId: user._id,
			status: 'pending',
			totalPrice: totals.grandTotal,
			shipping: totals.shipping,
			createdAt: Date.now(),
			address: args.addressId
		});

		await Promise.all(
			totals.lines.map((line) =>
				ctx.db.insert('purchases', {
					orderId,
					productId: line.productId as Id<'products'>,
					quantity: line.quantity,
					priceAtPurchase: line.unitPrice
				})
			)
		);

		return orderId;
	}
});
