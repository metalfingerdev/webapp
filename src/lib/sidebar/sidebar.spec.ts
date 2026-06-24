import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure-logic mirrors for sidebarService / useSidebar.
// Strips $state, DOM, and goto() — tests the state machine only.
// ---------------------------------------------------------------------------

type SidebarView = 'default' | 'shop' | 'cart' | 'auth';

interface SidebarState {
	view: SidebarView;
	isOpen: boolean;
	history: SidebarView[];
}

function initialState(): SidebarState {
	return { view: 'default', isOpen: false, history: [] };
}

function open(state: SidebarState, v: SidebarView = 'default'): SidebarState {
	return { view: v, isOpen: true, history: [] };
}

function close(state: SidebarState): SidebarState {
	return { ...state, isOpen: false };
}

function navigate(state: SidebarState, v: SidebarView): SidebarState {
	return { ...state, history: [...state.history, state.view], view: v };
}

function back(state: SidebarState): SidebarState {
	const prev = state.history.at(-1);
	return { ...state, history: state.history.slice(0, -1), view: prev ?? 'default' };
}

// navigateTo no longer accepts or sets a view — closes sidebar and clears history only
function navigateTo(state: SidebarState): SidebarState {
	return { ...state, history: [], isOpen: false };
}

function canGoBack(state: SidebarState): boolean {
	return state.history.length > 0;
}

function computeViewIs(view: SidebarView) {
	return {
		default: view === 'default',
		shop: view === 'shop',
		cart: view === 'cart',
		auth: view === 'auth'
	};
}

// ---------------------------------------------------------------------------
// open()
// ---------------------------------------------------------------------------

describe('open', () => {
	it('defaults to "default" view', () => {
		const s = open(initialState());
		expect(s.view).toBe('default');
		expect(s.isOpen).toBe(true);
	});

	it('accepts an explicit view', () => {
		expect(open(initialState(), 'shop').view).toBe('shop');
		expect(open(initialState(), 'auth').view).toBe('auth');
	});

	it('always clears history, even if history existed', () => {
		const prior: SidebarState = { view: 'cart', isOpen: true, history: ['default', 'shop'] };
		expect(open(prior).history).toEqual([]);
		expect(canGoBack(open(prior))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// close()
// ---------------------------------------------------------------------------

describe('close', () => {
	it('sets isOpen false but preserves view and history', () => {
		let s = open(initialState(), 'shop');
		s = navigate(s, 'cart');
		s = close(s);
		expect(s.isOpen).toBe(false);
		expect(s.view).toBe('cart');
		expect(s.history).toEqual(['shop']);
	});
});

// ---------------------------------------------------------------------------
// navigate()
// ---------------------------------------------------------------------------

describe('navigate', () => {
	it('changes view and pushes previous view onto history', () => {
		let s = open(initialState()); // view: default, history: []
		s = navigate(s, 'shop'); // view: shop,    history: [default]
		s = navigate(s, 'cart'); // view: cart,    history: [default, shop]

		expect(s.view).toBe('cart');
		expect(s.history).toEqual(['default', 'shop']);
	});
});

// ---------------------------------------------------------------------------
// back()
// ---------------------------------------------------------------------------

describe('back', () => {
	it('restores the previous view and shrinks history', () => {
		let s = open(initialState());
		s = navigate(s, 'shop');
		s = navigate(s, 'cart');

		s = back(s);
		expect(s.view).toBe('shop');
		expect(s.history).toEqual(['default']);

		s = back(s);
		expect(s.view).toBe('default');
		expect(s.history).toEqual([]);
	});

	it('falls back to "default" and never throws when history is empty', () => {
		let s = open(initialState(), 'cart');
		s = back(s);
		s = back(s);
		s = back(s);
		expect(s.view).toBe('default');
		expect(s.history).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// canGoBack
// ---------------------------------------------------------------------------

describe('canGoBack', () => {
	it('is false after open() and true after navigate(), false again after back() empties stack', () => {
		let s = open(initialState(), 'shop');
		expect(canGoBack(s)).toBe(false);

		s = navigate(s, 'cart');
		expect(canGoBack(s)).toBe(true);

		s = back(s);
		expect(canGoBack(s)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// navigateTo  — does NOT set view, only closes and clears history
// ---------------------------------------------------------------------------

describe('navigateTo', () => {
	it('closes the sidebar and clears history without touching view', () => {
		let s = open(initialState(), 'shop');
		s = navigate(s, 'cart'); // view: cart, history: [shop]

		s = navigateTo(s);

		expect(s.isOpen).toBe(false);
		expect(s.history).toEqual([]);
		expect(s.view).toBe('cart'); // view unchanged — URL owns view now
	});
});

// ---------------------------------------------------------------------------
// is view helpers (includes auth added in hook)
// ---------------------------------------------------------------------------

describe('is view helpers', () => {
	it('exactly one helper is true per view', () => {
		const views: SidebarView[] = ['default', 'shop', 'cart', 'auth'];
		for (const view of views) {
			const h = computeViewIs(view);
			const trueCount = [h.default, h.shop, h.cart, h.auth].filter(Boolean).length;
			expect(trueCount).toBe(1);
		}
	});
});

// ---------------------------------------------------------------------------
// Lifecycle sequence
// ---------------------------------------------------------------------------

describe('lifecycle: open → navigate → back → close', () => {
	it('produces correct state at each step', () => {
		type Snap = { label: string; view: SidebarView; isOpen: boolean; canGoBack: boolean };
		const snap = (label: string, s: SidebarState): Snap => ({
			label,
			view: s.view,
			isOpen: s.isOpen,
			canGoBack: canGoBack(s)
		});

		let s = initialState();
		const steps = [snap('1. initial', s)];

		s = open(s);
		steps.push(snap('2. opened', s));

		s = navigate(s, 'shop');
		steps.push(snap('3. → shop', s));

		s = navigate(s, 'cart');
		steps.push(snap('4. → cart', s));

		s = back(s);
		steps.push(snap('5. back → shop', s));

		s = back(s);
		steps.push(snap('6. back → default', s));

		s = close(s);
		steps.push(snap('7. closed', s));

		expect(steps).toEqual([
			{ label: '1. initial', view: 'default', isOpen: false, canGoBack: false },
			{ label: '2. opened', view: 'default', isOpen: true, canGoBack: false },
			{ label: '3. → shop', view: 'shop', isOpen: true, canGoBack: true },
			{ label: '4. → cart', view: 'cart', isOpen: true, canGoBack: true },
			{ label: '5. back → shop', view: 'shop', isOpen: true, canGoBack: true },
			{ label: '6. back → default', view: 'default', isOpen: true, canGoBack: false },
			{ label: '7. closed', view: 'default', isOpen: false, canGoBack: false }
		]);
	});
});
