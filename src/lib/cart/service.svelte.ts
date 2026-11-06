// src/lib/cart/service.svelte.ts
import { setContext, getContext } from 'svelte';
import { useMutation, useQuery } from 'convex-svelte';
import { api } from '$convex/_generated/api.js';
import type { Id } from '$convex/_generated/dataModel.js';
import { useSidebar, type SidebarService } from '$lib/sidebar/sidebar.svelte.js';
import { useCheckout, type CheckoutController } from '$lib/checkout/checkout.svelte.js';
import { CartState } from './state.svelte.js';
import { processCheckout, type CheckoutDependencies } from './checkout.js';
import type { PaymentProcessor } from '$lib/razorpay/payment-processor.js';
import type {
	CartItem,
	CheckoutResult,
	AuthService,
	DbCartState,
	CartStateMutations
} from './types.js';

export class CartService {
	isPurchasing = $state(false);
	error = $state<string | null>(null);

	constructor(
		public state: CartState,
		private auth: AuthService,
		// Sidebar is still used for the auth detour (auth lives in the sidebar);
		// the checkout/payment steps now live in their own modal.
		private sidebar: SidebarService,
		private checkoutUI: CheckoutController,
		// PROPER DI: Depend on the interface abstraction, not the mock implementation class
		private processor: PaymentProcessor,
		private checkoutMutations: CheckoutDependencies['mutations']
	) {}

	get items() {
		return this.state.items;
	}
	get isEmpty() {
		return this.state.isEmpty;
	}
	get total() {
		return this.state.total;
	}
	get totalItemsCount() {
		return this.state.totalItemsCount;
	}

	addItem(item: Omit<CartItem, 'quantity'>) {
		this.state.changeQuantity(item.productId, 1, item);
	}
	incrementQuantity(productId: Id<'products'>) {
		this.state.changeQuantity(productId, 1);
	}
	decreaseQuantity(productId: Id<'products'>) {
		this.state.changeQuantity(productId, -1);
	}

	async changeQuantity(
		productId: Id<'products'>,
		delta: number,
		productDetails?: Omit<CartItem, 'quantity'>
	) {
		return await this.state.changeQuantity(productId, delta, productDetails);
	}

	async checkout(addressId: Id<'addresses'>): Promise<CheckoutResult> {
		if (this.isEmpty) return { status: 'empty' };

		if (!this.auth.isAuthenticated()) {
			// Auth lives in the sidebar, so hand off there: close the checkout modal,
			// run auth, then reopen the modal and retry once signed in.
			this.checkoutUI.close();
			this.sidebar.openAuth(async () => {
				// Leave the sidebar's auth view before handing back to the modal so
				// the two never stack as competing modal dialogs.
				this.sidebar.close();
				this.checkoutUI.open();
				await this.checkout(addressId);
			});
			return { status: 'unauthenticated' };
		}

		this.isPurchasing = true;
		this.error = null;

		try {
			// The payment gateway surfaces inside the modal via paymentUIState (set by
			// the processor), so there's no view to navigate to here.
			const orderId = await processCheckout({
				items: this.items,
				addressId,
				mutations: this.checkoutMutations,
				processor: this.processor // Injected down into checkout context cleanly
			});

			await this.state.clear();
			// Swap the modal to its confirmation state in place — no navigation.
			this.checkoutUI.succeed(orderId);
			return { status: 'success', orderId };
		} catch (e: unknown) {
			this.error = e instanceof Error ? e.message : 'Checkout failed.';
			// Stay on the modal's address step; cart.error renders there.
			return { status: 'error', message: this.error };
		} finally {
			this.isPurchasing = false;
		}
	}
}

const CART_KEY = Symbol('cart');

export function initCart(auth: AuthService, processor: PaymentProcessor): CartService {
	const sidebar = useSidebar();
	const checkoutUI = useCheckout();

	// Skip the DB query entirely when unauthenticated. When authed, send no args:
	// the server resolves the cart owner from the session, not from the client.
	const queryResult = useQuery(api.cart.getCart, () => (auth.isAuthenticated() ? {} : 'skip'));

	const dbCartThunk = () => queryResult as unknown as DbCartState;

	const stateMutations: CartStateMutations = {
		mergeGuestCart: useMutation(
			api.cart.mergeGuestCart
		) as unknown as CartStateMutations['mergeGuestCart'],
		updateQuantity: useMutation(
			api.cart.updateQuantity
		) as unknown as CartStateMutations['updateQuantity'],
		clearCart: useMutation(api.cart.clearCart) as unknown as CartStateMutations['clearCart']
	};

	const checkoutMutations: CheckoutDependencies['mutations'] = {
		validateStock: useMutation(api.products.validateCartStock),
		createOrder: useMutation(api.orders.createOrder),
		confirmOrder: useMutation(api.orders.confirmOrder)
	};

	const state = new CartState(auth, dbCartThunk, stateMutations);
	const service = new CartService(state, auth, sidebar, checkoutUI, processor, checkoutMutations);

	setContext(CART_KEY, service);
	return service;
}

export function useCart(): CartService {
	return getContext<CartService>(CART_KEY);
}
