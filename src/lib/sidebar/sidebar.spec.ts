import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure-logic mirrors for sidebarService / useSidebar.
// Strips $state, DOM, and goto() — tests the state machine only.
// ---------------------------------------------------------------------------

type SidebarView = 'default' | 'shop' | 'cart' | 'auth' | 'user';

interface SidebarState {
	view: SidebarView;
	isOpen: boolean;
	history: SidebarView[];
}

function initialState(): SidebarState {
	return { view: 'default', isOpen: false, history: [] };
}

// open/close/toggle only touch isOpen — view + history persist
function open(state: SidebarState): SidebarState {
	return { ...state, isOpen: true };
}

function close(state: SidebarState): SidebarState {
	return { ...state, isOpen: false };
}

function toggle(state: SidebarState): SidebarState {
	return state.isOpen ? close(state) : open(state);
}

// show() sets what's displayed (and opens) — replaces the old open('view')
function show(state: SidebarState, v: SidebarView): SidebarState {
	return { ...state, view: v, isOpen: true, history: [] };
}

function navigate(state: SidebarState, v: SidebarView): SidebarState {
	return { ...state, history: [...state.history, state.view], view: v };
}

function back(state: SidebarState): SidebarState {
	const prev = state.history.at(-1);
	return { ...state, history: state.history.slice(0, -1), view: prev ?? 'default' };
}

// exit() does not set a view — it closes the sidebar and clears history (the
// real exit() also goto()s a URL, which is out of scope for this pure mirror).
function exit(state: SidebarState): SidebarState {
	return { ...state, history: [], isOpen: false };
}

function canGoBack(state: SidebarState): boolean {
	return state.history.length > 0;
}

// ---------------------------------------------------------------------------
// open()
// ---------------------------------------------------------------------------

describe('open', () => {
	it('opens without changing the persisted view or history', () => {
		const prior: SidebarState = { view: 'cart', isOpen: false, history: ['default', 'shop'] };
		const s = open(prior);
		expect(s.isOpen).toBe(true);
		expect(s.view).toBe('cart');
		expect(s.history).toEqual(['default', 'shop']);
	});

	it('shows the default view when nothing has been shown yet', () => {
		const s = open(initialState());
		expect(s.view).toBe('default');
		expect(s.isOpen).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// show() — sets the persisted view and opens
// ---------------------------------------------------------------------------

describe('show', () => {
	it('sets the view, opens, and clears history', () => {
		expect(show(initialState(), 'shop').view).toBe('shop');
		expect(show(initialState(), 'auth').isOpen).toBe(true);

		const prior: SidebarState = { view: 'cart', isOpen: true, history: ['default', 'shop'] };
		expect(show(prior, 'auth').history).toEqual([]);
		expect(canGoBack(show(prior, 'auth'))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// toggle() — flips visibility, view persists
// ---------------------------------------------------------------------------

describe('toggle', () => {
	it('opens when closed and closes when open, preserving the view', () => {
		let s = show(initialState(), 'cart');
		s = navigate(s, 'shop'); // view: shop, history: [cart]

		s = toggle(s); // closes
		expect(s.isOpen).toBe(false);
		expect(s.view).toBe('shop');
		expect(s.history).toEqual(['cart']);

		s = toggle(s); // reopens to the same persisted view
		expect(s.isOpen).toBe(true);
		expect(s.view).toBe('shop');
		expect(s.history).toEqual(['cart']);
	});
});

// ---------------------------------------------------------------------------
// close()
// ---------------------------------------------------------------------------

describe('close', () => {
	it('sets isOpen false but preserves view and history', () => {
		let s = show(initialState(), 'shop');
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
		let s = show(initialState(), 'cart');
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
		let s = show(initialState(), 'shop');
		expect(canGoBack(s)).toBe(false);

		s = navigate(s, 'cart');
		expect(canGoBack(s)).toBe(true);

		s = back(s);
		expect(canGoBack(s)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// exit  — does NOT set view, only closes and clears history
// ---------------------------------------------------------------------------

describe('exit', () => {
	it('closes the sidebar and clears history without touching view', () => {
		let s = show(initialState(), 'shop');
		s = navigate(s, 'cart'); // view: cart, history: [shop]

		s = exit(s);

		expect(s.isOpen).toBe(false);
		expect(s.history).toEqual([]);
		expect(s.view).toBe('cart'); // view unchanged — URL owns view now
	});
});

// ---------------------------------------------------------------------------
// show() as a root reset
// (checkout/payment are no longer sidebar views — they live in their own modal)
// ---------------------------------------------------------------------------

describe('show() resets to a root view', () => {
	it('show(user) opens the account view as a fresh root', () => {
		const s = show(navigate(show(initialState(), 'cart'), 'shop'), 'user');
		expect(s.view).toBe('user');
		expect(s.isOpen).toBe(true);
		expect(canGoBack(s)).toBe(false); // show() always clears history
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
