<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { Plus } from '@lucide/svelte';
	import { Card, Button, Badge } from './ui/index.js';
	import ProductModal from './products/product-modal.svelte';
	import {
		useDashboard,
		fmtINR,
		PRODUCT_FILTERS,
		type ProductFilter
	} from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	let filter = $state<ProductFilter>('all');
	let deleteId = $state<Id<'products'> | null>(null);
	let stockDelta = $state<Record<string, number>>({});
	let modal = $state<ReturnType<typeof ProductModal>>();

	const rows = $derived(
		filter === 'all'
			? (dash.products.data ?? [])
			: (dash.products.data ?? []).filter((p) => p.category === filter)
	);

	async function confirmDelete() {
		if (!deleteId) return;
		await dash.removeProduct({ id: deleteId });
		deleteId = null;
	}

	async function adjust(id: Id<'products'>) {
		const delta = stockDelta[id];
		if (!delta) return;
		await dash.adjustStock({ id, delta });
		stockDelta = { ...stockDelta, [id]: 0 };
	}
</script>

<header class="head">
	<h1>Products</h1>
	<Button onclick={() => modal?.openCreate()}><Plus size={16} /> Add product</Button>
</header>

<div class="filters">
	{#each PRODUCT_FILTERS as { value, label } (value)}
		<button class="chip" class:active={filter === value} onclick={() => (filter = value)}
			>{label}</button
		>
	{/each}
</div>

<Card>
	{#if dash.products.isLoading}
		<p class="empty">Loading…</p>
	{:else if rows.length === 0}
		<p class="empty">No products{filter !== 'all' ? ` in ${filter}` : ''}.</p>
	{:else}
		<div class="table-wrap">
			<table class="rtable">
				<thead>
					<tr><th>Name</th><th>Category</th><th>School</th><th>Price</th><th>Stock</th><th></th></tr
					>
				</thead>
				<tbody>
					{#each rows as p (p._id)}
						<tr>
							<td class="name" data-label="Name">{p.name}</td>
							<td data-label="Category"><Badge>{p.details.type}</Badge></td>
							<td class="muted" data-label="School">{dash.schoolNameOf(p)}</td>
							<td class="tabular" data-label="Price">{fmtINR(p.salePrice)}</td>
							<td class="tabular" data-label="Stock" class:low={p.stock <= 5}>{p.stock}</td>
							<td class="rtable-full">
								{#if deleteId === p._id}
									<span class="confirm">
										Delete?
										<Button size="sm" variant="destructive" onclick={confirmDelete}>Yes</Button>
										<Button size="sm" variant="ghost" onclick={() => (deleteId = null)}>No</Button>
									</span>
								{:else}
									<div class="actions">
										<Button size="sm" variant="outline" onclick={() => modal?.openEdit(p)}
											>Edit</Button
										>
										<Button size="sm" variant="ghost" onclick={() => (deleteId = p._id)}
											>Delete</Button
										>
										<input
											class="qty"
											type="number"
											placeholder="±qty"
											bind:value={stockDelta[p._id]}
										/>
										<Button
											size="sm"
											variant="outline"
											disabled={!stockDelta[p._id]}
											onclick={() => adjust(p._id)}
										>
											Adjust
										</Button>
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<ProductModal bind:this={modal} />

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
		@apply cursor-pointer rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100;
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
	tbody tr:last-child td {
		@apply border-b-0;
	}
	.name {
		@apply font-medium text-neutral-900;
	}
	.muted {
		@apply text-neutral-500;
	}
	.tabular {
		@apply tabular-nums;
	}
	.low {
		@apply font-semibold text-amber-600;
	}
	.actions {
		@apply flex flex-wrap items-center gap-2;
	}
	.confirm {
		@apply inline-flex items-center gap-2 text-sm text-neutral-600;
	}
	.qty {
		@apply h-8 w-20 rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
	}
</style>
