// src/lib/razorpay/gateway.svelte.ts

// Keep only primitive/plain values in $state
export const paymentUIState = $state({
	isOpen: false,
	isLoading: false,
	amount: 0
});

// Store callbacks outside $state — plain module-level variables
let _resolve: ((value: void) => void) | null = null;
let _reject: ((reason: Error) => void) | null = null;

// Open the gateway in a loading state while the server prepares the payment
// order (the real amount isn't known yet, so don't show a stale/zero figure).
export function openGatewayLoading() {
	paymentUIState.amount = 0;
	paymentUIState.isLoading = true;
	paymentUIState.isOpen = true;
}

export function requestUserPayment(amount: number): Promise<void> {
	return new Promise((resolve, reject) => {
		_resolve = resolve;
		_reject = reject;
		paymentUIState.amount = amount;
		paymentUIState.isLoading = false;
		paymentUIState.isOpen = true;
	});
}

export function closeGateway(success: boolean) {
	paymentUIState.isOpen = false;
	paymentUIState.isLoading = false;

	if (success) {
		_resolve?.();
	} else {
		_reject?.(new Error('Payment cancelled by user.'));
	}

	_resolve = null;
	_reject = null;
}
