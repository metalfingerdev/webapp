// Razorpay's webhook (POST /razorpay-webhook, registered in http.ts). The body is trusted only when
// its HMAC under RAZORPAY_WEBHOOK_SECRET matches the X-Razorpay-Signature header.
import { internal } from '../../_generated/api.js';
import type { ActionCtx } from '../../_generated/server.js';
import { signatureMatches } from './razorpay.js';

type Entity = Record<string, unknown> | undefined;

const entity = (payload: unknown, name: string): Entity => {
	const wrapper = (payload as Record<string, unknown> | null)?.[name];
	const inner = (wrapper as { entity?: unknown } | null | undefined)?.entity;
	return inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : undefined;
};
const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

export const handleRazorpayWebhook = async (ctx: ActionCtx, req: Request) => {
	const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
	if (!secret) return new Response('Webhook not set up', { status: 503 });

	const raw = await req.text();
	const signature = req.headers.get('x-razorpay-signature') ?? '';
	if (!signature || !(await signatureMatches(secret, raw, signature))) {
		return new Response('Bad signature', { status: 401 });
	}

	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		return new Response('Bad body', { status: 400 });
	}
	const type = text((body as { event?: unknown } | null)?.event);
	if (!type) return new Response('Bad body', { status: 400 });
	const payload = (body as { payload?: unknown }).payload;
	const payment = entity(payload, 'payment');
	const refund = entity(payload, 'refund');

	await ctx.runMutation(internal.store.payments.handleEvent, {
		// Razorpay sends the same id on every retry of one event
		eventId: req.headers.get('x-razorpay-event-id') ?? signature,
		type,
		gatewayOrderId: text(payment?.order_id),
		gatewayPaymentId: text(refund?.payment_id) ?? text(payment?.id),
		amount: typeof payment?.amount === 'number' ? payment.amount : undefined,
		gatewayRefundId: text(refund?.id)
	});
	return new Response(null, { status: 200 });
};
