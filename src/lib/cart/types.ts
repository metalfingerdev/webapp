// src/lib/cart/types.ts
import type { Id } from '$convex/_generated/dataModel.js';

export interface CartStateMutations {
	/**
	 * Merges guest items from local storage into the user's database cart upon a successful login.
	 */
	mergeGuestCart: (args: {
		userId: string;
		items: {
			productId: Id<'products'>;
			quantity: number;
		}[];
	}) => Promise<void>;

	/**
	 * Increments, decrements, or removes an item from the user's database cart.
	 */
	updateQuantity: (args: {
		userId: string;
		productId: Id<'products'>;
		delta: number; // Expects +1 or -1
	}) => Promise<void>;

	/**
	 * Clears all items belonging to a specific user out of the database cart table.
	 */
	clearCart: (args: { userId: string }) => Promise<void>;
}

export type ProductCategory = 'book' | 'clothes' | 'stationary';

export interface AuthService {
	isAuthenticated(): boolean;
	getUserId(): string; // Added to strictly type your user identification
}

export type DbCartItemWithProduct = {
	productId: Id<'products'>;
	quantity: number;
	product: {
		name: string;
		salePrice: number;
		stock: number;
		category: 'book' | 'clothes' | 'stationary';
	};
};

export type DbCartState = {
	readonly error: Error | null;
	readonly data: DbCartItemWithProduct[] | null;
};

export interface BundleContext {
	schoolId: Id<'schools'>;
	grade: string;
	schoolName?: string;
}

export interface CartItem {
	productId: Id<'products'>;
	name: string;
	quantity: number;
	price: number;
	stock: number;
	category: ProductCategory;
	bundleContext?: BundleContext;
}

export type CheckoutResult =
	| { status: 'empty' }
	| { status: 'unauthenticated' }
	| { status: 'success'; orderId: Id<'orders'> }
	| { status: 'error'; message: string };
