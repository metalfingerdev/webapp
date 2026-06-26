<script lang="ts">
	// src/components/app/app-initialize.svelte
	import { useQuery, useAction } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useAuth } from '$lib/svelte/index.js';
	import { MockPaymentProcessor } from '$lib/razorpay/mock-payment-processor.js';
	import { initSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { initCheckout } from '$lib/checkout/checkout.svelte.js';
	import { initCart } from '$lib/cart/index.js';

	import Sidebar from '$components/sidebar/sidebar.svelte';
	import { CheckoutDialog } from '$components/checkout/index.js';
	import NavigationBar from '$components/navbar/navigation-bar.svelte';

	initSidebar();
	// Must precede initCart — initCart() resolves the checkout controller via context.
	initCheckout();

	const auth = useAuth();
	const userQuery = useQuery(api.auth.getCurrentUser);
	const createPaymentOrder = useAction(api.orders.createPaymentOrder);
	const processor = new MockPaymentProcessor(createPaymentOrder);

	initCart(
		{
			isAuthenticated: () => auth.isAuthenticated,
			getUserId: () => userQuery.data?._id ?? 'guest'
		},
		processor // Injected cleanly as a type-compliant PaymentProcessor
	);

	let { children, data } = $props();
</script>

<NavigationBar />

<Sidebar {data} />

<CheckoutDialog />

{@render children()}

<style lang="postcss">
	@reference "src/app.css";
</style>
