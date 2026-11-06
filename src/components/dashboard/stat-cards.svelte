<script lang="ts">
	import { Card } from './ui/index.js';
	import { useDashboard, fmtINR } from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	const cards = $derived.by(() => {
		const statistics = dash.stats.data;

		if (!statistics) return [];

		return [
			{ label: 'Orders', value: String(statistics.totalOrders) },
			{ label: 'Revenue', value: fmtINR(statistics.totalRevenue) },
			{ label: 'Products', value: String(statistics.totalProducts) },
			{ label: 'Schools', value: String(statistics.totalSchools) },
			{
				label: 'Low stock',
				value: String(statistics.lowStockProducts.length),
				alert: statistics.lowStockProducts.length > 0
			}
		];
	});
</script>

<section class="stats">
	{#each cards as card (card.label)}
		<Card class="stat">
			<span class="label">{card.label}</span>
			<span class="value" class:alert={card.alert}>{card.value}</span>
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
