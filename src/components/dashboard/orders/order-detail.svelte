<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { untrack } from 'svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { Button } from '../ui/index.js';
	import { downloadInvoice, downloadPackingSlip } from '$lib/pdf/index.js';
	import {
		useDashboard,
		ORDER_STATUSES,
		type OrderStatus
	} from '$lib/dashboard/dashboard.svelte.js';

	type OrderItem = { _id: string; quantity: number; priceAtPurchase: number; product: { name: string } | null };
	type OrderRow = {
		_id: Id<'orders'>;
		status: string;
		trackingId?: string;
		address: { street: string; city: string; state: string; pincode: string; label?: string } | null;
		items: OrderItem[];
	};

	let { order, onTrack }: { order: OrderRow; onTrack: (id: Id<'orders'>) => void } = $props();

	const dash = useDashboard();
	const convex = useConvexClient();

	// Initial value only — the row remounts per order, so it never goes stale.
	let statusDraft = $state<OrderStatus>(untrack(() => order.status) as OrderStatus);
	let trackingId = $state('');
	let savingStatus = $state(false);
	let pdfBusy = $state(false);

	const canCancel = $derived(!['delivered', 'shipped', 'cancelled'].includes(order.status));

	async function saveStatus() {
		savingStatus = true;
		try {
			await dash.updateOrderStatus({ id: order._id, status: statusDraft, trackingId: trackingId || undefined });
		} finally {
			savingStatus = false;
		}
	}

	async function downloadDoc(kind: 'invoice' | 'packing') {
		pdfBusy = true;
		try {
			const doc = await convex.query(api.dashboard.getOrderDocument, { orderId: order._id });
			if (kind === 'invoice') await downloadInvoice(doc);
			else await downloadPackingSlip(doc);
		} finally {
			pdfBusy = false;
		}
	}
</script>

<div class="detail">
	{#if order.address}
		<p class="addr">
			{order.address.street}, {order.address.city}, {order.address.state} — {order.address.pincode}
			{#if order.address.label}<span class="muted">({order.address.label})</span>{/if}
		</p>
	{:else}
		<p class="muted">No address.</p>
	{/if}

	<table class="items">
		<thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
		<tbody>
			{#each order.items as item (item._id)}
				<tr>
					<td>{item.product?.name ?? '—'}</td>
					<td class="tabular">{item.quantity}</td>
					<td class="tabular">{dash.fmt(item.priceAtPurchase)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="row">
		<select class="in" bind:value={statusDraft}>
			{#each ORDER_STATUSES as s (s)}<option value={s}>{s}</option>{/each}
		</select>
		{#if statusDraft === 'shipped'}
			<input class="in" bind:value={trackingId} placeholder="Tracking ID" />
		{/if}
		<Button size="sm" onclick={saveStatus} disabled={savingStatus}>
			{savingStatus ? 'Saving…' : 'Update status'}
		</Button>
		{#if canCancel}
			<Button size="sm" variant="destructive" onclick={() => dash.cancelOrder({ id: order._id })}>Cancel order</Button>
		{/if}
	</div>

	{#if order.trackingId}<p class="muted">Carrier ID: {order.trackingId}</p>{/if}

	<div class="row">
		<Button size="sm" variant="outline" onclick={() => onTrack(order._id)}>+ Tracking event</Button>
		<span class="spacer"></span>
		<Button size="sm" variant="outline" disabled={pdfBusy} onclick={() => downloadDoc('invoice')}>
			{pdfBusy ? 'Preparing…' : 'Invoice PDF'}
		</Button>
		<Button size="sm" variant="outline" disabled={pdfBusy} onclick={() => downloadDoc('packing')}>
			{pdfBusy ? 'Preparing…' : 'Packing slip'}
		</Button>
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.detail {
		@apply grid gap-3 bg-neutral-50 p-4;
	}
	.addr {
		@apply text-sm text-neutral-700;
	}
	.muted {
		@apply text-sm text-neutral-500;
	}
	.items {
		@apply w-full rounded-md bg-white text-sm;

		thead th {
			@apply border-b border-neutral-100 px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase;
		}
		tbody td {
			@apply border-b border-neutral-100 px-3 py-2 last:border-b-0;
		}
	}
	.tabular {
		@apply tabular-nums;
	}
	.row {
		@apply flex flex-wrap items-center gap-2;
	}
	.spacer {
		@apply flex-1;
	}
	.in {
		@apply h-8 rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
	}
</style>
