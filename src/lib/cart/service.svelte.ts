// src/lib/cart/service.svelte.ts
import { setContext, getContext } from 'svelte';
import { useMutation, useQuery } from 'convex-svelte';
import { api } from '$convex/_generated/api.js';
import type { Id } from '$convex/_generated/dataModel.js';
import { useSidebar, type SidebarService } from '$lib/sidebar/sidebar.svelte.js';
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
		private sidebar: SidebarService,
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
			this.sidebar.openAuth(async () => {
				this.sidebar.open('cart');
				await this.checkout(addressId);
			});
			return { status: 'unauthenticated' };
		}

		this.isPurchasing = true;
		this.error = null;

		try {
			const orderId = await processCheckout({
				items: this.items,
				total: this.total,
				addressId,
				mutations: this.checkoutMutations,
				processor: this.processor, // Injected down into checkout context cleanly
				onReadyForPayment: () => this.sidebar.navigate('payment')
			});

			await this.state.clear();
			this.sidebar.navigate('user');
			return { status: 'success', orderId };
		} catch (e: unknown) {
			this.error = e instanceof Error ? e.message : 'Checkout failed.';
			// FIX: Navigate back to checkout (not payment) so the error is visible.
			this.sidebar.navigate('checkout');
			return { status: 'error', message: this.error };
		} finally {
			this.isPurchasing = false;
		}
	}
}

const CART_KEY = Symbol('cart');

export function initCart(auth: AuthService, processor: PaymentProcessor): CartService {
	const sidebar = useSidebar();

	// FIX: Skip the DB query entirely when unauthenticated instead of
	// querying for userId: 'guest' which hits the database unnecessarily.
	const queryResult = useQuery(api.cart.getCart, () =>
		auth.isAuthenticated() ? { userId: auth.getUserId() } : 'skip'
	);

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
	const service = new CartService(state, auth, sidebar, processor, checkoutMutations);

	setContext(CART_KEY, service);
	return service;
}

export function useCart(): CartService {
	return getContext<CartService>(CART_KEY);
}
