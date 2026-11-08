// Opens Razorpay Checkout for an order. Its script loads only when a customer pays, so no other page
// carries it. The amount comes from the server (store/payments.ts#start); success here is only a
// claim until the server checks it (store/payments.ts#confirm) or the webhook arrives.
import type { ConvexClient } from 'convex/browser';
import { api } from '#convex/_generated/api.js';

type RazorpayResponse = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};
type RazorpayCheckout = new (options: Record<string, unknown>) => { open: () => void };

declare global {
	interface Window {
		Razorpay?: RazorpayCheckout;
	}
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<RazorpayCheckout> | null = null;

const loadCheckout = () =>
	(loading ??= new Promise<RazorpayCheckout>((resolve, reject) => {
		if (window.Razorpay) return resolve(window.Razorpay);
		const script = document.createElement('script');
		script.src = CHECKOUT_SCRIPT;
		script.async = true;
		script.onload = () =>
			window.Razorpay ? resolve(window.Razorpay) : reject(new Error('payment script'));
		script.onerror = () => {
			loading = null; // let the next tap try again
			script.remove();
			reject(new Error('payment script'));
		};
		document.head.append(script);
	}));

/** `paid`: confirmed by the server; `pending`: paid, the bank is still confirming; `closed`: not paid */
export type PayOutcome = 'paid' | 'pending' | 'closed';

export const payForOrder = async (client: ConvexClient, number: string): Promise<PayOutcome> => {
	const [details, Razorpay] = await Promise.all([
		client.action(api.store.payments.start, { number }),
		loadCheckout()
	]);
	return new Promise<PayOutcome>((resolve, reject) => {
		const checkout = new Razorpay({
			key: details.keyId,
			order_id: details.gatewayOrderId,
			amount: details.amount,
			currency: 'INR',
			name: details.storeName,
			description: details.number,
			prefill: { name: details.name, contact: details.phone },
			timeout: details.secondsLeft,
			handler: (response: RazorpayResponse) => {
				client
					.action(api.store.payments.confirm, {
						gatewayOrderId: response.razorpay_order_id,
						gatewayPaymentId: response.razorpay_payment_id,
						signature: response.razorpay_signature
					})
					// The money was taken; if the check itself fails the webhook still settles it
					.then(resolve, () => resolve('pending'));
			},
			modal: { ondismiss: () => resolve('closed') }
		});
		try {
			checkout.open();
		} catch (error) {
			reject(error);
		}
	});
};
