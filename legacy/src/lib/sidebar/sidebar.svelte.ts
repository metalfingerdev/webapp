// src/lib/sidebar/sidebar.svelte.ts
import { setContext, getContext } from 'svelte';
import { goto } from '$app/navigation';

// 'checkout' and 'payment' moved out of the sidebar into their own modal
// (CheckoutController) — a linear flow must not be back-navigable.
// 'books' | 'uniform' | 'stationary' | 'school' are hims.com-style category
// drill-downs, all rendered by category.svelte (parameterised by the view).
export type SidebarView =
	| 'default'
	| 'shop'
	| 'cart'
	| 'auth'
	| 'user'
	| 'books'
	| 'uniform'
	| 'stationary'
	| 'school';

type PostAuthAction = () => void | Promise<void>;

export class SidebarService {
	view = $state<SidebarView>('default');
	isOpen = $state(false);
	history = $state<SidebarView[]>([]);
	// +1 = drilling forward (navigate/show), -1 = going back. Drives the slide
	// direction of the view transition in the host.
	direction = $state<1 | -1>(1);

	private postAuthAction: PostAuthAction | null = null;

	get canGoBack() {
		return this.history.length > 0;
	}

	// Method vocabulary:
	//   open / close / toggle  — visibility only; `view` persists across them.
	//   show(v)                — open at a root view, clearing history.
	//   navigate(v)            — drill down: push current view, then go.
	//   back()                 — pop one level (fallback 'default').
	//   exit(href)             — leave the sidebar entirely: close + route.

	// --- Visibility: these only touch `isOpen`. The current `view` persists,
	// so closing and reopening (or toggling) keeps showing the same thing. ---

	open = () => {
		this.isOpen = true;
	};

	close = () => {
		this.isOpen = false;
		this.postAuthAction = null;
	};

	toggle = () => {
		if (this.isOpen) this.close();
		else this.open();
	};

	// --- View: `show` sets what the sidebar displays (and opens it). This is
	// the replacement for the old `open('view')` call. ---

	show = (v: SidebarView) => {
		this.direction = 1;
		this.view = v;
		this.history = [];
		this.isOpen = true;
	};

	openAuth = (onSuccess: PostAuthAction) => {
		this.postAuthAction = onSuccess;
		this.show('auth');
	};

	resolveAuth = async () => {
		const action = this.postAuthAction;
		this.postAuthAction = null;
		await action?.();
	};

	navigate = (v: SidebarView) => {
		this.direction = 1;
		this.history.push(this.view);
		this.view = v;
	};

	back = () => {
		this.direction = -1;
		const prev = this.history.pop();
		this.view = prev ?? 'default';
	};

	// Leaves the sidebar entirely: clears nav history, closes, and routes to a URL.
	exit = (href: string) => {
		this.history = [];
		this.close();
		goto(href);
	};
}

const SIDEBAR_KEY = Symbol('sidebar');

export function initSidebar() {
	const sidebar = new SidebarService();
	setContext(SIDEBAR_KEY, sidebar);
	return sidebar;
}

export function useSidebar() {
	const context = getContext<SidebarService>(SIDEBAR_KEY);
	if (!context) throw new Error('useSidebar() must be called within initSidebar() tree');
	return context;
}
