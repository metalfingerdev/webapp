// Talking to Razorpay: the keys, its REST API and its signatures. Runs in the default Convex runtime
// (fetch and Web Crypto), so no Node action is needed. The keys are Convex env vars per deployment
// (.agents/skills/store-app/references/payments.md), never in the repo.
import { ConvexError } from 'convex/values';

export const RAZORPAY_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];

/** Env vars this deployment is missing, by name only */
export const missingRazorpayEnv = () => RAZORPAY_ENV.filter((name) => !process.env[name]);

/** Online payment is offered only where the API keys are set (staging has none until asked) */
export const onlinePaymentReady = () =>
	Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const encoder = new TextEncoder();

const hmacHex = async (secret: string, message: string) => {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Compares every character, so the time taken says nothing about how much matched */
const sameText = (a: string, b: string) => {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
};

/** True when `signature` is the HMAC-SHA256 of `message` under `secret` */
export const signatureMatches = async (secret: string, message: string, signature: string) =>
	sameText(await hmacHex(secret, message), signature);

/** For tests: signs a message the way Razorpay does */
export const signForTest = hmacHex;

/** Calls the Razorpay REST API with the key pair; throws with Razorpay's own description */
export const razorpayApi = async <T>(
	path: string,
	init: { method: 'GET' | 'POST'; body?: Record<string, unknown> } = { method: 'GET' }
): Promise<T> => {
	const keyId = process.env.RAZORPAY_KEY_ID;
	const keySecret = process.env.RAZORPAY_KEY_SECRET;
	if (!keyId || !keySecret) throw new ConvexError('Online payment is not set up');
	const response = await fetch(`https://api.razorpay.com/v1${path}`, {
		method: init.method,
		headers: {
			Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
			'Content-Type': 'application/json'
		},
		body: init.body ? JSON.stringify(init.body) : undefined
	});
	const json = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const error = (json as { error?: { description?: unknown } } | null)?.error;
		const description = typeof error?.description === 'string' ? error.description : '';
		throw new Error(`Razorpay ${response.status} on ${path}: ${description}`);
	}
	return json as T;
};
