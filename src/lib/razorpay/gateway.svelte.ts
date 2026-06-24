// src/lib/razorpay/gateway.svelte.ts

// Keep only primitive/plain values in $state
export const paymentUIState = $state({
	isOpen: false,
	amount: 0
});

// Store callbacks outside $state — plain module-level variables
let _resolve: ((value: void) => void) | null = null;
let _reject: ((reason: Error) => void) | null = null;

export function requestUserPayment(amount: number): Promise<void> {
	return new Promise((resolve, reject) => {
		_resolve = resolve;
		_reject = reject;
		paymentUIState.amount = amount;
		paymentUIState.isOpen = true;
	});
}

export function closeGateway(success: boolean) {
	paymentUIState.isOpen = false;

	if (success) {
		_resolve?.();
	} else {
		_reject?.(new Error('Payment cancelled by user.'));
	}

	_resolve = null;
	_reject = null;
}
