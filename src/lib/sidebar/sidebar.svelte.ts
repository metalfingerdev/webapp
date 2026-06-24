// src/lib/sidebar/sidebar.svelte.ts
import { setContext, getContext } from 'svelte';
import { goto } from '$app/navigation';

export type SidebarView = 'default' | 'shop' | 'cart' | 'auth' | 'user' | 'checkout' | 'payment';

type PostAuthAction = () => void | Promise<void>;

export class SidebarService {
	view = $state<SidebarView>('default');
	isOpen = $state(false);
	history = $state<SidebarView[]>([]);

	private postAuthAction: PostAuthAction | null = null;

	get canGoBack() {
		return this.history.length > 0;
	}

	get is() {
		return {
			default: this.view === 'default',
			shop: this.view === 'shop',
			cart: this.view === 'cart',
			auth: this.view === 'auth',
			user: this.view === 'user',
			checkout: this.view === 'checkout',
			payment: this.view === 'payment'
		};
	}

	open = (v: SidebarView = 'default') => {
		this.view = v;
		this.history = [];
		this.isOpen = true;
	};

	openAuth = (onSuccess: PostAuthAction) => {
		this.postAuthAction = onSuccess;
		this.open('auth');
	};

	resolveAuth = async () => {
		const action = this.postAuthAction;
		this.postAuthAction = null;
		await action?.();
	};

	close = () => {
		this.isOpen = false;
		this.postAuthAction = null;
	};

	navigate = (v: SidebarView) => {
		this.history.push(this.view);
		this.view = v;
	};

	back = () => {
		const prev = this.history.pop();
		this.view = prev ?? 'default';
	};

	navigateTo = (href: string) => {
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
