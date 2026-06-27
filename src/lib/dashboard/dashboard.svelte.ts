// src/lib/dashboard/dashboard.svelte.ts
//
// Shared dashboard state: the queries, mutations and helpers every panel needs,
// held in a context so the feature components (products / schools / orders) stay
// small and don't prop-drill. Mirrors the navbar / sidebar / cart services.
import { setContext, getContext } from 'svelte';
import { useQuery, useMutation } from 'convex-svelte';
import { api } from '$convex/_generated/api.js';
import type { Doc } from '$convex/_generated/dataModel.js';

export type Category = 'book' | 'clothes' | 'stationary';
export type ProductFilter = 'all' | Category;
export type OrderStatus =
	| 'pending'
	| 'confirmed'
	| 'processing'
	| 'shipped'
	| 'delivered'
	| 'cancelled';
export type TrackingStatus =
	| 'order_placed'
	| 'processing'
	| 'dispatched'
	| 'in_transit'
	| 'out_for_delivery'
	| 'delivered';
export type DashTab = 'products' | 'schools' | 'orders';

export type Product = Doc<'products'>;
export type School = Doc<'schools'>;

export const PRODUCT_FILTERS: { value: ProductFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'book', label: 'Books' },
	{ value: 'clothes', label: 'Clothes' },
	{ value: 'stationary', label: 'Stationary' }
];

export const ORDER_STATUSES: OrderStatus[] = [
	'pending',
	'confirmed',
	'processing',
	'shipped',
	'delivered',
	'cancelled'
];

export const TRACKING_STATUSES: TrackingStatus[] = [
	'order_placed',
	'processing',
	'dispatched',
	'in_transit',
	'out_for_delivery',
	'delivered'
];

export const fmtINR = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

export class DashboardService {
	// Shared reactive queries (Convex dedupes the subscriptions, so reading these
	// from several panels is free).
	products = useQuery(api.dashboard.listProducts);
	schools = useQuery(api.dashboard.listSchools);
	stats = useQuery(api.dashboard.getDashboardStats);

	// Mutations — centralised so panels just call dash.createProduct(...).
	createProduct = useMutation(api.dashboard.createProduct);
	updateProduct = useMutation(api.dashboard.updateProduct);
	removeProduct = useMutation(api.dashboard.removeProduct);
	adjustStock = useMutation(api.dashboard.adjustStock);

	createSchool = useMutation(api.dashboard.createSchool);
	updateSchool = useMutation(api.dashboard.updateSchool);
	removeSchool = useMutation(api.dashboard.removeSchool);
	addToBundle = useMutation(api.dashboard.addToBundle);
	removeFromBundle = useMutation(api.dashboard.removeFromBundle);

	updateOrderStatus = useMutation(api.dashboard.updateOrderStatus);
	cancelOrder = useMutation(api.dashboard.cancelOrder);
	pushTrackingEvent = useMutation(api.dashboard.pushTrackingEvent);

	// id -> school name, for rendering product rows / selects.
	schoolMap = $derived<Record<string, string>>(
		Object.fromEntries((this.schools.data ?? []).map((s) => [s._id, s.name]))
	);

	schoolNameOf(p: Product): string {
		const d = p.details;
		if ((d.type === 'book' || d.type === 'clothes') && d.school) {
			return this.schoolMap[d.school] ?? '—';
		}
		return '—';
	}

	fmt = fmtINR;
}

const DASHBOARD_KEY = Symbol('dashboard');

export function initDashboard() {
	const dash = new DashboardService();
	setContext(DASHBOARD_KEY, dash);
	return dash;
}

export function useDashboard(): DashboardService {
	const dash = getContext<DashboardService>(DASHBOARD_KEY);
	if (!dash) throw new Error('useDashboard() must be called within initDashboard() tree');
	return dash;
}
