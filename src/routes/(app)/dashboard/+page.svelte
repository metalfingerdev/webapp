<script lang="ts">
	import { initDashboard, type DashTab } from '$lib/dashboard/dashboard.svelte.js';
	import DashboardShell from '$components/dashboard/dashboard-shell.svelte';
	import StatCards from '$components/dashboard/stat-cards.svelte';
	import ProductsPanel from '$components/dashboard/products/products-panel.svelte';
	import SchoolsPanel from '$components/dashboard/schools/schools-panel.svelte';
	import OrdersPanel from '$components/dashboard/orders/orders-panel.svelte';

	// Sets up shared queries/mutations for the whole dashboard tree.
	initDashboard();

	let tab = $state<DashTab>('products');
</script>

<DashboardShell bind:tab>
	<div class="page">
		<StatCards />

		{#if tab === 'products'}
			<ProductsPanel />
		{:else if tab === 'schools'}
			<SchoolsPanel />
		{:else}
			<OrdersPanel />
		{/if}
	</div>
</DashboardShell>

<style lang="postcss">
	@reference 'src/app.css';

	.page {
		@apply mx-auto grid w-full max-w-6xl gap-6;
	}
</style>
