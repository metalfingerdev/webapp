<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { istDayStart, useNow } from '#lib/store/admin/clock.svelte.js';
	import OrderCard from '#lib/store/admin/OrderCard.svelte';
	import ShipForm from '#lib/store/admin/ShipForm.svelte';
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

<h1 class="mb-2 text-2xl font-extrabold">{text.title}</h1>
<p class="text-text-muted mb-4 text-sm">{text.intro}</p>

{#if !board.data}
	<div class="bone h-40 rounded-xl"></div>
{:else if packed.length === 0}
	<p class="text-text-muted py-10 text-center">{text.empty}</p>
{:else}
	<ul class="list">
		{#each packed as order (order._id)}
			<li class="panel item">
				<OrderCard {order} now={now.value} />
				<ShipForm number={order.number} local={order.deliveryMethod === 'local'} />
			</li>
		{/each}
	</ul>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.list {
		@apply grid gap-3 lg:grid-cols-2;
	}
	.item {
		@apply flex flex-col gap-3 p-3;
	}
</style>
