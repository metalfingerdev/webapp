// The cart on the client. Signed out, the lines live in localStorage and the server only prices
// them; signed in, they live in the `carts` table and every change sends the whole list. When a
// guest signs in, their lines are added to the account cart once and the local copy is cleared.
// If storage is blocked the guest cart simply lasts until the page closes.
import { getContext, setContext } from 'svelte';
import { useConvexClient, useQuery } from 'convex-svelte';
import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
import { api } from '#convex/_generated/api.js';
import { mergeLines, type LooseLine } from '#convex/model/store/cart.js';
import type { ShopDrawer } from './drawer.svelte.js';

const KEY = 'aggarwalkart:cart';

const isLine = (value: unknown): value is LooseLine => {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return typeof v.variantId === 'string' && typeof v.quantity === 'number';
};

const load = (): LooseLine[] => {
	try {
		const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(saved) ? mergeLines(saved.filter(isLine)) : [];
	} catch {
		return [];
	}
};

const store = (lines: LooseLine[]) => {
	try {
		if (lines.length) localStorage.setItem(KEY, JSON.stringify(lines));
		else localStorage.removeItem(KEY);
	} catch {
		// storage blocked: the cart lasts until the page closes
	}
};

export class Cart {
	/** Say what happened to the last add, for a screen reader and the button label */
	justAdded = $state(false);

	private auth = useAuth();
	private client = useConvexClient();
	private guestLines = $state<LooseLine[]>([]);
	private loaded = $state(false);
	private merging = false;
	private signedIn = $derived(this.auth.isAuthenticated);
	private mine = useQuery(api.store.cart.getCart, () => (this.signedIn ? {} : 'skip'));
	private guest = useQuery(api.store.cart.getGuestCart, () =>
		!this.signedIn && !this.auth.isLoading && this.loaded ? { lines: this.guestLines } : 'skip'
	);

	/** The shop drawer, opened at the cart view after something is added */
	private drawer: ShopDrawer;

	constructor(drawer: ShopDrawer) {
		this.drawer = drawer;
		$effect(() => {
			this.guestLines = load();
			this.loaded = true;
		});
		// Signed in with a guest cart waiting: add it to the account cart, once
		$effect(() => {
			if (!this.signedIn || !this.loaded || this.merging || this.guestLines.length === 0) return;
			this.merging = true;
			const lines = this.guestLines;
			this.client
				.mutation(api.store.cart.mergeGuest, { lines })
				.then(() => {
					this.guestLines = [];
					store([]);
				})
				.catch(() => {})
				.finally(() => (this.merging = false));
		});
	}

	view = $derived(this.signedIn ? this.mine.data : this.guest.data);
	/** Priced lines are still on their way */
	loading = $derived(this.view === undefined);
	/** Copies in the cart. Before the server answers, the guest's own count. */
	count = $derived(
		this.view?.count ?? this.guestLines.reduce((sum, line) => sum + line.quantity, 0)
	);

	private current = (): LooseLine[] =>
		this.signedIn
			? (this.mine.data?.lines ?? []).map(({ variantId, quantity, fromSetId }) => ({
					variantId,
					quantity,
					fromSetId
				}))
			: this.guestLines;

	private write = async (lines: LooseLine[]) => {
		if (this.signedIn) await this.client.mutation(api.store.cart.setLines, { lines });
		else {
			this.guestLines = lines;
			store(lines);
		}
	};

	/** Adds lines (quantities add up to the per-line cap) and opens the drawer */
	add = async (added: LooseLine[]) => {
		await this.write(mergeLines(this.current(), added));
		this.justAdded = true;
		this.drawer.show('cart');
	};

	setQuantity = (variantId: string, quantity: number) =>
		this.write(
			mergeLines(
				this.current()
					.filter((line) => line.variantId !== variantId || quantity > 0)
					.map((line) => (line.variantId === variantId ? { ...line, quantity } : line))
			)
		);

	/**
	 * The set page's "Update cart": the set's lines in the cart become exactly these (lines the parent
	 * unticked go), and the drawer opens on the cart
	 */
	replaceSet = async (setId: string, lines: LooseLine[]) => {
		const others = this.current().filter((line) => line.fromSetId !== setId);
		await this.write(mergeLines([...others, ...lines]));
		this.justAdded = true;
		this.drawer.show('cart');
	};

	/** The cart's lines that came from this set, for starting the set page from them */
	linesOfSet = (setId: string): LooseLine[] =>
		this.current().filter((line) => line.fromSetId === setId);

	remove = (variantId: string) => this.setQuantity(variantId, 0);
	clear = () => this.write([]);
}

const CONTEXT = Symbol('cart');
export const provideCart = (drawer: ShopDrawer) => setContext(CONTEXT, new Cart(drawer));
export const useCart = () => getContext<Cart>(CONTEXT);
