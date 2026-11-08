<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { istDayStart, useNow } from '#lib/store/admin/clock.svelte.js';
	import OrderCard from '#lib/store/admin/OrderCard.svelte';
	import { formatPrice } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';

	// The live order board (admin.md): open orders by column, today's numbers on top.
	const text = strings.admin.board;
	const now = useNow();
	const dayStart = $derived(istDayStart(now.value));
	const board = useQuery(api.store.admin.orders.board, () => ({ dayStart }));

	const columns = $derived(
		board.data
			? ([
					['awaitingPayment', board.data.awaitingPayment],
					['toPack', board.data.toPack],
					['packed', board.data.packed],
					['shipped', board.data.shipped]
				] as const)
			: []
	);
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-extrabold">{text.title}</h1>

{#if board.error}
	<p class="text-danger">{board.error.message}</p>
{:else if !board.data}
	<div class="stats">
		<div class="bone h-20 rounded-xl"></div>
		<div class="bone h-20 rounded-xl"></div>
	</div>
	<div class="columns" aria-busy="true">
		{#each { length: 4 }, i (i)}<div class="bone h-60 rounded-xl"></div>{/each}
	</div>
{:else}
	<div class="stats">
		<div class="stat">
			<span class="value">{board.data.today.orders}</span>
			<span class="label">{text.todayOrders}</span>
		</div>
		<div class="stat" title={text.revenueHint}>
			<span class="value">{formatPrice(board.data.today.revenue)}</span>
			<span class="label">{text.todayRevenue}</span>
		</div>
	</div>

	<div class="columns">
		{#each columns as [key, orders] (key)}
			<section class="column" aria-labelledby="col-{key}">
				<h2 id="col-{key}">
					{text.columns[key]} <span class="count">{orders.length}</span>
				</h2>
				{#if orders.length === 0}
					<p class="empty">{text.emptyColumn}</p>
				{:else}
					<ul class="cards">
						{#each orders as order (order._id)}
							<li><OrderCard {order} now={now.value} /></li>
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.stats {
		@apply mb-4 grid grid-cols-2 gap-3 sm:max-w-md;
	}
	.stat {
		@apply flex flex-col rounded-xl raised p-3;
	}
	.value {
		@apply text-2xl font-extrabold;
	}
	.label {
		@apply text-sm text-text-muted;
	}
	.columns {
		@apply grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4;
	}
	.column {
		@apply flex flex-col gap-2 rounded-2xl sunken p-2;

		h2 {
			@apply flex items-center justify-between px-1 pt-1 text-sm font-extrabold;
		}
	}
	.count {
		@apply tag;
	}
	.cards {
		@apply flex flex-col gap-2;
	}
	.empty {
		@apply px-1 py-4 text-center text-sm text-text-muted;
	}
</style>
