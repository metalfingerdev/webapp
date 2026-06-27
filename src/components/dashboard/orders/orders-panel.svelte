<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { usePaginatedQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { Download } from '@lucide/svelte';
	import { Card, Button, Badge } from '../ui/index.js';
	import OrderDetail from './order-detail.svelte';
	import TrackingModal from './tracking-modal.svelte';
	import {
		useDashboard,
		ORDER_STATUSES,
		type OrderStatus
	} from '$lib/dashboard/dashboard.svelte.js';
	import { downloadPackingSlips } from '$lib/pdf/index.js';

	const dash = useDashboard();
	const convex = useConvexClient();

	let statusFilter = $state<OrderStatus | 'all'>('all');
	let expandedId = $state<Id<'orders'> | null>(null);
	let batchBusy = $state(false);
	let tracking = $state<ReturnType<typeof TrackingModal>>();

	const ordersQ = usePaginatedQuery(
		api.dashboard.listOrders,
		() => ({ status: statusFilter === 'all' ? undefined : statusFilter }),
		{ initialNumItems: 50 }
	);

	const TONE: Record<string, 'neutral' | 'green' | 'blue' | 'amber' | 'red'> = {
		pending: 'amber',
		confirmed: 'blue',
		processing: 'blue',
		shipped: 'blue',
		delivered: 'green',
		cancelled: 'red'
	};

	async function downloadAllPackingSlips() {
		batchBusy = true;
		try {
			const docs = await Promise.all(
				ordersQ.results.map((o) => convex.query(api.dashboard.getOrderDocument, { orderId: o._id }))
			);
			await downloadPackingSlips(docs, `packing-slips.pdf`);
		} finally {
			batchBusy = false;
		}
	}
</script>

<header class="head">
	<h1>Orders</h1>
	{#if ordersQ.results.length}
		<Button variant="outline" disabled={batchBusy} onclick={downloadAllPackingSlips}>
			<Download size={16} />
			{batchBusy ? 'Building…' : `Packing slips (${ordersQ.results.length})`}
		</Button>
	{/if}
</header>

<div class="filters">
	<button class="chip" class:active={statusFilter === 'all'} onclick={() => (statusFilter = 'all')}>All</button>
	{#each ORDER_STATUSES as s (s)}
		<button class="chip" class:active={statusFilter === s} onclick={() => (statusFilter = s)}>{s}</button>
	{/each}
</div>

<Card>
	{#if ordersQ.isLoading}
		<p class="empty">Loading…</p>
	{:else if ordersQ.results.length === 0}
		<p class="empty">No orders{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr><th>Order</th><th>Status</th><th>Items</th><th>Total</th><th>Date</th><th></th></tr>
				</thead>
				<tbody>
					{#each ordersQ.results as o (o._id)}
						<tr>
							<td class="mono">#{o._id.slice(-8)}</td>
							<td><Badge tone={TONE[o.status] ?? 'neutral'}>{o.status}</Badge></td>
							<td>{o.items.length}</td>
							<td class="tabular">{dash.fmt(o.totalPrice)}</td>
							<td class="muted">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
							<td>
								<Button size="sm" variant="ghost" onclick={() => (expandedId = expandedId === o._id ? null : o._id)}>
									{expandedId === o._id ? 'Collapse' : 'Details'}
								</Button>
							</td>
						</tr>
						{#if expandedId === o._id}
							<tr class="expanded">
								<td colspan="6"><OrderDetail order={o} onTrack={(id) => tracking?.openFor(id)} /></td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		{#if ordersQ.status === 'CanLoadMore'}
			<div class="more">
				<Button variant="outline" onclick={() => ordersQ.loadMore(50)}>Load more</Button>
			</div>
		{/if}
	{/if}
</Card>

<TrackingModal bind:this={tracking} />

<style lang="postcss">
	@reference 'src/app.css';

	.head {
		@apply mb-4 flex items-center justify-between;
		h1 {
			@apply text-xl font-semibold text-neutral-900;
		}
	}
	.filters {
		@apply mb-3 flex flex-wrap gap-2;
	}
	.chip {
		@apply cursor-pointer rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600 capitalize hover:bg-neutral-100;
		&.active {
			@apply border-neutral-900 bg-neutral-900 text-white;
		}
	}
	.empty {
		@apply p-6 text-sm text-neutral-500;
	}
	.table-wrap {
		@apply overflow-x-auto;
	}
	table {
		@apply w-full text-sm;
	}
	thead th {
		@apply border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-neutral-500 uppercase;
	}
	tbody td {
		@apply border-b border-neutral-100 px-4 py-3 align-middle;
	}
	.expanded td {
		@apply p-0;
	}
	.mono {
		@apply font-mono text-neutral-900;
	}
	.muted {
		@apply text-neutral-500;
	}
	.tabular {
		@apply tabular-nums;
	}
	.more {
		@apply flex justify-center border-t border-neutral-100 p-3;
	}
</style>
