<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FunctionReturnType } from 'convex/server';
	import type { api } from '#convex/_generated/api.js';
	import { formatDate, formatPrice, formatTime } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Pill from '#lib/ui/Pill.svelte';

	type Card = FunctionReturnType<typeof api.store.admin.orders.search>[number];

	// One order on the board or in a list. `now` drives the payment-window warning.
	let {
		order,
		now,
		showStatus = false
	}: { order: Card; now: number; showStatus?: boolean } = $props();
	const text = strings.admin;

	/** Ten minutes left in the payment window: worth a look */
	const closing = $derived(order.payBy !== null && order.payBy - now < 10 * 60_000);
</script>

<a class="card" href={resolve('/admin/orders/[number]', { number: order.number })}>
	<span class="top">
		<span class="number">{order.number}</span>
		<span class="total">{formatPrice(order.total)}</span>
	</span>
	<span class="who">{order.customer} · {order.city}</span>
	<span class="meta">
		{formatDate(order.placedAt)}, {formatTime(order.placedAt)} ·
		{order.paymentMethod === 'cod' ? text.orders.cod : text.orders.online}
	</span>
	<span class="pills">
		{#if showStatus}<Pill>{text.orders.statuses[order.status]}</Pill>{/if}
		{#if order.payBy !== null}
			<Pill tone={closing ? 'bad' : 'warn'}>
				{closing ? text.board.payLate : text.board.payBy(formatTime(order.payBy))}
			</Pill>
		{/if}
		{#if order.returnRequested}<Pill tone="warn">{text.board.returnAsked}</Pill>{/if}
	</span>
</a>

<style lang="postcss">
	@reference 'src/app.css';

	a.card {
		@apply flex press flex-col gap-1 rounded-3xl raised p-4;

		span.top {
			@apply flex items-baseline justify-between gap-2;

			span.number {
				@apply font-mono text-sm font-bold;
			}
			span.total {
				@apply font-display text-lg font-bold;
			}
		}
		span.who {
			@apply truncate text-sm;
		}
		span.meta {
			@apply text-xs text-text-muted;
		}
		span.pills {
			@apply mt-1 flex flex-wrap gap-1 empty:hidden;
		}
	}
</style>
