<script lang="ts">
	import type { Component } from 'svelte';
	import { initDashboard, type Tab } from '$lib/dashboard/dashboard.svelte.js';
	import DashboardShell from '$components/dashboard/dashboard-shell.svelte';
	import StatCards from '$components/dashboard/stat-cards.svelte';
	import ProductsPanel from '$components/dashboard/products-panel.svelte';
	import SchoolsPanel from '$components/dashboard/schools-panel.svelte';
	import OrdersPanel from '$components/dashboard/orders-panel.svelte';

	initDashboard();

	let tab = $state<Tab>('products');

	const Panels: Record<Tab, Component> = {
		products: ProductsPanel,
		schools: SchoolsPanel,
		orders: OrdersPanel
	};

	const Panel = $derived(Panels[tab]);
</script>

<DashboardShell bind:tab>
	<div class="page">
		<StatCards />
		<Panel />
	</div>
</DashboardShell>

<style lang="postcss">
	@reference 'src/app.css';

	.page {
		@apply mx-auto grid w-full max-w-6xl gap-6;
	}
</style>
