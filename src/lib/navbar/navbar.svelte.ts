// src/lib/navbar/navbar.svelte.ts
import { setContext, getContext } from 'svelte';
import { goto } from '$app/navigation';

/**
 * Shared state for the navigation bar. The bar's two interactive features —
 * the hover mega-menu and the Apple-style search — each have their trigger and
 * their panel living in different parts of the DOM, so the state that ties them
 * together can't be local to a single component. This service is the single
 * source of truth; the row, the search panel, and the viewport all read it.
 */
export class NavbarService {
	// --- Mega-menu (hover dropdown) ---
	isMenuOpen = $state(false);
	activeIndex = $state<number | null>(null);
	navbarRef = $state<HTMLElement | undefined>(undefined);
	triggerRefs = $state<HTMLButtonElement[]>([]);
	panelRefs = $state<HTMLDivElement[]>([]);
	// Geometry the viewport reads to size and slide itself under the active trigger.
	viewportWidth = $state(0);
	viewportHeight = $state(0);
	viewportX = $state(0);
	indicatorX = $state(0);
	// True only for the first frame(s) of opening from closed. The viewport reads
	// it to snap into place (no transition) on open, so it doesn't slide/grow from
	// the previous trigger's spot — or, worse, from the un-measured 0×0 origin.
	justOpened = $state(false);
	// Geometry starts unmeasured; the view stays hidden until this flips true, so
	// the 0×0 panel (a tiny dark border box) never flashes on screen.
	get isPositioned() {
		return this.viewportWidth > 0 && this.viewportHeight > 0;
	}
	#closeTimer: ReturnType<typeof setTimeout> | undefined;

	// --- Search ---
	isSearchOpen = $state(false);
	searchTerm = $state('');
	searchInputRef = $state<HTMLInputElement | undefined>(undefined);

	// Open the dropdown for a trigger and slide the viewport beneath it. Search
	// and the dropdowns are mutually exclusive, so opening one closes the other.
	openPanel = (index: number) => {
		clearTimeout(this.#closeTimer);
		// Snap on open-from-closed; animate only when moving between triggers.
		this.justOpened = !this.isMenuOpen;
		this.isSearchOpen = false;
		this.activeIndex = index;
		this.isMenuOpen = true;
		requestAnimationFrame(() => {
			this.#positionViewport(index);
			// Re-enable transitions the frame after the snap so trigger-to-trigger
			// moves still morph.
			if (this.justOpened) requestAnimationFrame(() => (this.justOpened = false));
		});
	};

	#positionViewport = (index: number) => {
		const trigger = this.triggerRefs[index];
		const panel = this.panelRefs[index];
		if (!trigger || !panel || !this.navbarRef) return;

		this.viewportWidth = panel.offsetWidth;
		this.viewportHeight = panel.offsetHeight;

		const navRect = this.navbarRef.getBoundingClientRect();
		const triggerRect = trigger.getBoundingClientRect();
		const triggerCenter = triggerRect.left - navRect.left + triggerRect.width / 2;

		this.viewportX = triggerCenter - this.viewportWidth / 2;
		this.indicatorX = triggerCenter - 6;
	};

	// Brief delay before closing so moving the cursor from trigger to panel
	// doesn't snap the menu shut.
	scheduleClose = () => {
		this.#closeTimer = setTimeout(this.closeMenu, 150);
	};

	cancelClose = () => clearTimeout(this.#closeTimer);

	closeMenu = () => {
		this.isMenuOpen = false;
		this.activeIndex = null;
	};

	toggleSearch = () => {
		this.isSearchOpen = !this.isSearchOpen;
		this.closeMenu();
		if (!this.isSearchOpen) this.searchTerm = '';
	};

	closeSearch = () => {
		this.isSearchOpen = false;
		this.searchTerm = '';
	};

	// Enter → full results page (handles >8 matches that autocomplete can't show).
	submitSearch = () => {
		const q = this.searchTerm.trim();
		if (!q) return;
		this.closeSearch();
		goto(`/shop?q=${encodeURIComponent(q)}`);
	};

	// Collapse everything — used when a click lands outside the bar.
	dismiss = () => {
		this.closeMenu();
		this.closeSearch();
	};
}

const NAVBAR_KEY = Symbol('navbar');

export function initNavbar() {
	const navbar = new NavbarService();
	setContext(NAVBAR_KEY, navbar);
	return navbar;
}

export function useNavbar() {
	const context = getContext<NavbarService>(NAVBAR_KEY);
	if (!context) throw new Error('useNavbar() must be called within initNavbar() tree');
	return context;
}
