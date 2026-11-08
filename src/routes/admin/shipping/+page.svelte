<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { istDayStart, useNow } from '#lib/store/admin/clock.svelte.js';
	import OrderCard from '#lib/store/admin/OrderCard.svelte';
	import ShipForm from '#lib/store/admin/ShipForm.svelte';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';

	// Packed orders, each with the ship form open, for working through a pile of parcels.
	const text = strings.admin.shipping;
	const now = useNow();
	const board = useQuery(api.store.admin.orders.board, () => ({ dayStart: istDayStart() }));
	const packed = $derived(board.data?.packed ?? []);
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<PageHead title={text.title} lead={text.intro} size="headline" />

{#if !board.data}
	<div class="loading bone"></div>
{:else if packed.length === 0}
	<p class="empty">{text.empty}</p>
{:else}
	<ul class="list">
		{#each packed as order (order._id)}
			<li class="item">
				<OrderCard {order} now={now.value} />
				<ShipForm number={order.number} local={order.deliveryMethod === 'local'} />
			</li>
		{/each}
	</ul>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	div.loading {
		@apply h-40 rounded-[1.75rem];
	}
	p.empty {
		@apply py-10 text-center text-text-muted;
	}
	ul.list {
		@apply grid gap-4 lg:grid-cols-2;

		li.item {
			@apply flex flex-col gap-4 rounded-[1.75rem] raised p-4;
		}
	}
</style>
