// src/lib/checkout/checkout.svelte.ts
import { setContext, getContext } from 'svelte';
import type { Id } from '$convex/_generated/dataModel.js';

export type CheckoutStep = 'form' | 'success';

/**
 * Drives the checkout modal. Deliberately has NO history stack — unlike the
 * sidebar, the checkout flow is linear (address → pay → done) and must never be
 * back-navigable, which is the whole reason it was pulled out of the sidebar.
 * The modal host locks dismissal while a payment is in flight (see CartService
 * .isPurchasing), so there's no way to leave mid-payment either.
 */
export class CheckoutController {
	isOpen = $state(false);
	step = $state<CheckoutStep>('form');
	lastOrderId = $state<Id<'orders'> | null>(null);

	// Always (re)enters at the address form — a fresh attempt, never resumed.
	open = () => {
		this.step = 'form';
		this.lastOrderId = null;
		this.isOpen = true;
	};

	close = () => {
		this.isOpen = false;
	};

	// Swap the modal to its confirmation state; CartService calls this once the
	// order is confirmed and the cart cleared.
	succeed = (orderId: Id<'orders'>) => {
		this.lastOrderId = orderId;
		this.step = 'success';
	};
}

const CHECKOUT_KEY = Symbol('checkout');

export function initCheckout() {
	const checkout = new CheckoutController();
	setContext(CHECKOUT_KEY, checkout);
	return checkout;
}

export function useCheckout() {
	const context = getContext<CheckoutController>(CHECKOUT_KEY);
	if (!context) throw new Error('useCheckout() must be called within initCheckout() tree');
	return context;
}
