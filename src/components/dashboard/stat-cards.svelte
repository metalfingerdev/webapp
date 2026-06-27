<script lang="ts">
	import { Card } from './ui/index.js';
	import { useDashboard } from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	const cards = $derived.by(() => {
		const s = dash.stats.data;
		if (!s) return [];
		return [
			{ label: 'Orders', value: String(s.totalOrders) },
			{ label: 'Revenue', value: dash.fmt(s.totalRevenue) },
			{ label: 'Products', value: String(s.totalProducts) },
			{ label: 'Schools', value: String(s.totalSchools) },
			{ label: 'Low stock', value: String(s.lowStockProducts.length), alert: s.lowStockProducts.length > 0 }
		];
	});
</script>

<section class="stats">
	{#each cards as c (c.label)}
		<Card class="stat">
			<span class="label">{c.label}</span>
			<span class="value" class:alert={c.alert}>{c.value}</span>
		</Card>
	{/each}
</section>

<style lang="postcss">
	@reference 'src/app.css';

	.stats {
		@apply grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5;
	}

	:global(.stat) {
		@apply grid gap-1 p-4;
	}

	.label {
		@apply text-xs font-medium tracking-wide text-neutral-500 uppercase;
	}

	.value {
		@apply text-2xl font-semibold text-neutral-900 tabular-nums;

		&.alert {
			@apply text-amber-600;
		}
	}
</style>
