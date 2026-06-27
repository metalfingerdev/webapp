<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { Button } from '../ui/index.js';
	import { useDashboard } from '$lib/dashboard/dashboard.svelte.js';

	let { schoolId }: { schoolId: Id<'schools'> } = $props();

	const dash = useDashboard();

	let gradeFilter = $state('');
	let productId = $state<Id<'products'> | ''>('');
	let gradeInput = $state('');
	let submitting = $state(false);
	let error = $state('');

	// Self-contained: this panel only mounts when its school row is expanded.
	const bundles = useQuery(
		api.dashboard.listBundles,
		() => ({ schoolId, grade: gradeFilter || undefined })
	);

	async function add() {
		if (!productId || !gradeInput) return;
		submitting = true;
		error = '';
		try {
			await dash.addToBundle({ schoolId, grade: gradeInput, productId: productId as Id<'products'> });
			productId = '';
			gradeInput = '';
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Could not add.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="bundle">
	<div class="controls">
		<input class="in" bind:value={gradeFilter} placeholder="Filter grade…" />
		<span class="spacer"></span>
		<select class="in" bind:value={productId}>
			<option value="">Select product…</option>
			{#each dash.products.data ?? [] as p (p._id)}<option value={p._id}>{p.name}</option>{/each}
		</select>
		<input class="in" bind:value={gradeInput} placeholder="Grade (e.g. Class 5)" />
		<Button size="sm" disabled={submitting || !productId || !gradeInput} onclick={add}>
			{submitting ? 'Adding…' : 'Add'}
		</Button>
	</div>
	{#if error}<p class="err">{error}</p>{/if}

	{#if bundles.isLoading}
		<p class="muted">Loading…</p>
	{:else if (bundles.data ?? []).length === 0}
		<p class="muted">No bundle items{gradeFilter ? ` for ${gradeFilter}` : ''}.</p>
	{:else}
		<ul class="list">
			{#each bundles.data ?? [] as b (b._id)}
				<li>
					<span>{b.product?.name ?? '—'}</span>
					<span class="grade">{b.grade}</span>
					<Button size="sm" variant="ghost" onclick={() => dash.removeFromBundle({ id: b._id })}>
						Remove
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.bundle {
		@apply grid gap-3 rounded-lg bg-neutral-50 p-4;
	}
	.controls {
		@apply flex flex-wrap items-center gap-2;
	}
	.spacer {
		@apply flex-1;
	}
	.in {
		@apply h-8 rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
	}
	.err {
		@apply text-sm text-red-600;
	}
	.muted {
		@apply text-sm text-neutral-500;
	}
	.list {
		@apply grid gap-1;

		li {
			@apply flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm;
		}
		.grade {
			@apply ml-auto text-neutral-500;
		}
	}
</style>
