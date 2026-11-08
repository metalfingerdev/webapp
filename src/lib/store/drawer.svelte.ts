// The one drawer of the shop, from the right: the menu and the cart are views of it, like the old
// sidebar (legacy/src/lib/sidebar/sidebar.svelte.ts), kept small. `show` opens it at a root view;
// `go` and `back` move through the menu's history.
import { getContext, setContext } from 'svelte';

export type MenuCategory = {
	name: string;
	slug: string;
	children: { name: string; slug: string }[];
};

export type DrawerView =
	| { kind: 'root' }
	| { kind: 'cart' }
	| { kind: 'account' }
	| { kind: 'schools' }
	| { kind: 'school'; slug: string; name: string }
	| { kind: 'category'; category: MenuCategory };

export class ShopDrawer {
	open = $state(false);
	stack = $state<DrawerView[]>([{ kind: 'root' }]);
	/** Which way the last move went, so the new view slides in from that side */
	direction = $state<'fwd' | 'back'>('fwd');
	view = $derived(this.stack[this.stack.length - 1]);
	previous = $derived<DrawerView | undefined>(this.stack[this.stack.length - 2]);

	show = (kind: 'root' | 'cart' | 'account') => {
		this.direction = 'fwd';
		this.stack = [{ kind }];
		this.open = true;
	};

	go = (next: DrawerView) => {
		this.direction = 'fwd';
		this.stack = [...this.stack, next];
	};

	back = () => {
		this.direction = 'back';
		this.stack = this.stack.length > 1 ? this.stack.slice(0, -1) : [{ kind: 'root' }];
	};

	close = () => {
		this.open = false;
	};
}

const CONTEXT = Symbol('shop-drawer');
export const provideDrawer = () => setContext(CONTEXT, new ShopDrawer());
export const useDrawer = () => getContext<ShopDrawer>(CONTEXT);
