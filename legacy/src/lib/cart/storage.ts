// src/lib/cart/storage.ts
import type { CartItem } from './types.js';

const STORAGE_KEY = 'cart_state';

export const CartStorage = {
	load(): CartItem[] {
		if (typeof window === 'undefined') return [];
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	},

	save(items: CartItem[]) {
		if (typeof window === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	},

	clear() {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(STORAGE_KEY);
	}
};
