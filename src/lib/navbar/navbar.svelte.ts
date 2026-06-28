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
	// The panel we are leaving, captured on each switch. Drives the bits-ui
	// `data-motion` direction (slide in from / out toward the previous trigger);
	// null while opening from closed, so the active panel snaps in with no slide.
	previousIndex = $state<number | null>(null);
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
	#openTimer: ReturnType<typeof setTimeout> | undefined;
	// Hover-intent timing (ms). A short delay before opening keeps the menu from
	// popping when the cursor merely brushes past a trigger; a longer grace before
	// closing lets the cursor cross the gap into the panel — or slip off an edge
	// for a moment — without snapping shut. Switching between triggers while
	// already open stays instant; these only gate opening from / closing to the
	// fully-closed state.
	#openDelay = 150;
	#closeDelay = 250;
	#resizeObserver: ResizeObserver | undefined;

	// --- Search ---
	isSearchOpen = $state(false);
	searchTerm = $state('');
	searchInputRef = $state<HTMLInputElement | undefined>(undefined);

	// Hover entry point for the triggers. Debounces opening from closed (hover
	// intent); once open, switches between triggers immediately so the menu stays
	// responsive as the cursor travels along the row.
	hoverPanel = (index: number) => {
		clearTimeout(this.#closeTimer);
		clearTimeout(this.#openTimer);
		if (this.isMenuOpen) {
			this.openPanel(index);
			return;
		}
		this.#openTimer = setTimeout(() => this.openPanel(index), this.#openDelay);
	};

	// Open the dropdown for a trigger and slide the viewport beneath it. Search
	// and the dropdowns are mutually exclusive, so opening one closes the other.
	openPanel = (index: number) => {
		clearTimeout(this.#closeTimer);
		clearTimeout(this.#openTimer);
		// Snap on open-from-closed; animate only when moving between triggers.
		this.justOpened = !this.isMenuOpen;
		this.isSearchOpen = false;
		// null while opening from closed (snap, no enter slide); otherwise the panel
		// we're leaving, so the new one slides in from its side.
		this.previousIndex = this.isMenuOpen ? this.activeIndex : null;
		this.activeIndex = index;
		this.isMenuOpen = true;
		requestAnimationFrame(() => {
			this.#observePanel(index);
			// Re-enable transitions the frame after the snap so trigger-to-trigger
			// moves still morph.
			if (this.justOpened) requestAnimationFrame(() => (this.justOpened = false));
		});
	};

	// Mirror bits-ui's Viewport: a ResizeObserver keeps width/height (and the slide
	// offset) locked to the *live* size of the active panel, so async content — e.g.
	// the school-bundles query resolving — re-sizes the box through the CSS
	// transition instead of being clipped at the size measured on the opening frame.
	#observePanel = (index: number) => {
		const panel = this.panelRefs[index];
		if (!panel || !this.navbarRef) return;
		this.#resizeObserver ??= new ResizeObserver(() => this.#measure());
		this.#resizeObserver.disconnect();
		this.#resizeObserver.observe(panel);
		// Re-position if the centered bar itself reflows (e.g. window resize).
		this.#resizeObserver.observe(this.navbarRef);
		this.#measure();
	};

	#measure = () => {
		const index = this.activeIndex;
		if (index === null) return;
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

	// Grace period before closing so moving the cursor from trigger to panel (or
	// briefly off an edge) doesn't snap the menu shut. Also drops any pending open,
	// so brushing past a trigger and leaving never opens the menu after the fact.
	scheduleClose = () => {
		clearTimeout(this.#openTimer);
		this.#closeTimer = setTimeout(this.closeMenu, this.#closeDelay);
	};

	cancelClose = () => clearTimeout(this.#closeTimer);

	closeMenu = () => {
		clearTimeout(this.#openTimer);
		this.isMenuOpen = false;
		this.activeIndex = null;
		this.previousIndex = null;
		this.#resizeObserver?.disconnect();
	};

	// Deterministically open the search overlay (e.g. from the sidebar, which
	// can't toggle blind without risking closing an already-open panel).
	openSearch = () => {
		this.isSearchOpen = true;
		this.closeMenu();
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
