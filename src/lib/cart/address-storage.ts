// src/lib/cart/address-storage.ts
import type { Doc } from '$convex/_generated/dataModel.js';

export type AddressInput = Omit<Doc<'addresses'>, '_id' | '_creationTime' | 'userId'>;

const PENDING_ADDRESS_KEY = 'pending_address';

export const AddressStorage = {
	save(address: AddressInput) {
		localStorage.setItem(PENDING_ADDRESS_KEY, JSON.stringify(address));
	},
	load(): AddressInput | null {
		const data = localStorage.getItem(PENDING_ADDRESS_KEY);
		return data ? JSON.parse(data) : null;
	},
	clear() {
		localStorage.removeItem(PENDING_ADDRESS_KEY);
	}
};
