import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';
import { resend } from './email';
import { handleRazorpayWebhook } from './model/store/paymentWebhook.js';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
	path: '/resend-webhook',
	method: 'POST',
	handler: httpAction(async (ctx, req) => {
		return await resend.handleResendEventWebhook(ctx, req);
	})
});

http.route({
	path: '/razorpay-webhook',
	method: 'POST',
	handler: httpAction(handleRazorpayWebhook)
});

export default http;
