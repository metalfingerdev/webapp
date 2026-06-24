// src/lib/cart/state.svelte.ts
import type { Id } from '$convex/_generated/dataModel.js';
import type { CartItem, AuthService, DbCartState, CartStateMutations } from './types.js';
import { CartStorage } from './storage.js';

export class CartState {
	guestItems = $state<CartItem[]>([]); // start empty, always safe

	constructor(
		private auth: AuthService,
		private dbCart: () => DbCartState,
		private mutations: CartStateMutations
	) {
		$effect(() => {
			if (typeof window === 'undefined') return;

			if (!this.auth.isAuthenticated()) {
				const saved = CartStorage.load();
				if (saved.length > 0 && this.guestItems.length === 0) {
					this.guestItems = saved;
				}
				return;
			}

			// Authenticated but no guest items loaded yet — load then re-run
			if (this.guestItems.length === 0) {
				const saved = CartStorage.load();
				if (saved.length === 0) return;
				this.guestItems = saved; // triggers re-run with items populated
				return;
			}

			// Authenticated + guest items exist — merge
			const itemsToMerge = this.guestItems.map((i) => ({
				productId: i.productId,
				quantity: i.quantity
			}));

			let poll: ReturnType<typeof setInterval> | null = null;

			this.mutations
				.mergeGuestCart({ userId: this.auth.getUserId(), items: itemsToMerge })
				.then(() => {
					poll = setInterval(() => {
						const db = this.dbCart();
						if (db.data !== null) {
							this.guestItems = [];
							CartStorage.clear();
							if (poll) clearInterval(poll);
						}
					}, 50);
				})
				.catch((err) => {
					console.error('Failed to merge guest cart:', err);
				});

			return () => {
				if (poll) clearInterval(poll);
			};
		});
	}
	items = $derived.by((): CartItem[] => {
		if (this.auth.isAuthenticated()) {
			const currentDb = this.dbCart();
			if (currentDb.data) {
				return currentDb.data.map((item) => ({
					productId: item.productId,
					name: item.product.name,
					price: item.product.salePrice,
					quantity: item.quantity,
					stock: item.product.stock,
					category: item.product.category
				}));
			}
		}
		return this.guestItems;
	});

	isEmpty = $derived(this.items.length === 0);
	total = $derived.by(() => this.items.reduce((sum, item) => sum + item.price * item.quantity, 0));
	totalItemsCount = $derived.by(() => this.items.reduce((count, item) => count + item.quantity, 0));
	async changeQuantity(
		productId: Id<'products'>,
		delta: number,
		productDetails?: Omit<CartItem, 'quantity'>
	) {
		if (this.auth.isAuthenticated()) {
			await this.mutations.updateQuantity({
				userId: this.auth.getUserId(),
				productId,
				delta
			});
		} else {
			const existing = this.guestItems.find((i) => i.productId === productId);
			if (existing) {
				const newQty = existing.quantity + delta;
				if (newQty <= 0) {
					this.guestItems = this.guestItems.filter((i) => i.productId !== productId);
				} else {
					existing.quantity = Math.min(newQty, existing.stock);
				}
			} else if (delta > 0 && productDetails) {
				this.guestItems.push({ ...productDetails, quantity: 1 });
			}
			CartStorage.save(this.guestItems);
		}
	}

	async clear() {
		if (this.auth.isAuthenticated()) {
			await this.mutations.clearCart({ userId: this.auth.getUserId() });
		} else {
			this.guestItems = [];
			CartStorage.clear();
		}
	}
}
