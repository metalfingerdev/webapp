<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { istDayStart, useNow } from '#lib/store/admin/clock.svelte.js';
	import OrderCard from '#lib/store/admin/OrderCard.svelte';
	import { formatPrice } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
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

<PageHead title={text.title} size="headline" />

<div class="board">
	{#if board.error}
		<p class="failed">{board.error.message}</p>
	{:else if !board.data}
		<div class="stats">
			<div class="stat bone"></div>
			<div class="stat bone"></div>
		</div>
		<div class="columns" aria-busy="true">
			{#each { length: 4 }, i (i)}<div class="column bone"></div>{/each}
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
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.board {
		p.failed {
			@apply text-danger;
		}

		/* Today's numbers, magazine size */
		div.stats {
			@apply mb-8 grid grid-cols-2 gap-4 sm:max-w-xl;

			div.stat {
				@apply flex min-h-28 flex-col justify-end gap-1 rounded-[1.75rem] raised p-5;

				&.bone {
					@apply h-28;
				}
			}
			span.value {
				@apply font-display text-4xl font-semibold tracking-tight;
			}
			span.label {
				@apply text-sm text-text-muted;
			}
		}

		/* Each column is a well; the order cards rise out of it */
		div.columns {
			@apply grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4;
		}
		:is(section, div).column {
			@apply flex flex-col gap-3 rounded-[1.75rem] sunken p-3;

			&.bone {
				@apply h-60;
			}
			h2 {
				@apply flex items-center justify-between px-2 pt-1 type-kicker;
			}
			span.count {
				@apply tag;
			}
			ul.cards {
				@apply flex flex-col gap-3;
			}
			p.empty {
				@apply px-1 py-6 text-center text-sm text-text-muted;
			}
		}
	}
</style>
