<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { Button } from '../ui/index.js';
	import { useDashboard, fmtINR } from '$lib/dashboard/dashboard.svelte.js';

	let { schoolId, schoolName }: { schoolId: Id<'schools'>; schoolName: string } = $props();

	const dash = useDashboard();

	const hasSlug = $derived((dash.schools.data ?? []).find((s) => s._id === schoolId)?.slug);

	// A bundle is per (school, grade); pick/enter the grade to edit its contents.
	let grade = $state('');
	let productId = $state<Id<'products'> | ''>('');
	let quantity = $state(1);
	let submitting = $state(false);
	let error = $state('');

	const schoolBundles = useQuery(api.bundle.getSchoolBundles, () => ({ schoolId }));
	const items = useQuery(api.bundle.listBundleItems, () =>
		grade.trim() ? { schoolId, grade: grade.trim() } : 'skip'
	);

	// The saved bundle for the active grade (if any) — gives us the storefront link.
	const activeBundle = $derived((schoolBundles.data ?? []).find((b) => b.grade === grade.trim()));

	async function save() {
		if (!productId || !grade.trim() || quantity < 1) return;
		submitting = true;
		error = '';
		try {
			await dash.setBundleItem({
				schoolId,
				grade: grade.trim(),
				productId: productId as Id<'products'>,
				quantity
			});
			productId = '';
			quantity = 1;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="bundle">
	<div class="bp-head">
		<strong>Bundles · {schoolName}</strong>
		<span class="bp-hint">Pick or type a grade, then add products with quantities.</span>
	</div>

	{#if !hasSlug}
		<p class="bp-warn">
			This school has no URL slug — set one via Edit so its bundles get a storefront link.
		</p>
	{/if}

	<!-- Existing grades for this school — click to edit one. -->
	{#if (schoolBundles.data ?? []).length}
		<div class="grades">
			{#each schoolBundles.data ?? [] as b (b._id)}
				<button
					class="chip"
					class:active={grade.trim() === b.grade}
					onclick={() => (grade = b.grade)}
				>
					{b.grade} <span class="count">{b.itemCount}</span>
				</button>
			{/each}
		</div>
	{/if}

	<input class="in grade-in" bind:value={grade} placeholder="Grade (e.g. Class 5)" />

	{#if grade.trim()}
		<div class="controls">
			<select class="in" bind:value={productId}>
				<option value="">Select product…</option>
				{#each dash.products.data ?? [] as p (p._id)}<option value={p._id}>{p.name}</option>{/each}
			</select>
			<input class="in qty" type="number" min="1" bind:value={quantity} aria-label="Quantity" />
			<Button size="sm" disabled={submitting || !productId || quantity < 1} onclick={save}>
				{submitting ? 'Saving…' : 'Add / update'}
			</Button>
			{#if activeBundle?.schoolSlug}
				<a
					class="view"
					href="/shop/{activeBundle.schoolSlug}/{activeBundle.gradeSlug}"
					target="_blank"
					rel="noopener"
				>
					View storefront page ↗
				</a>
			{/if}
		</div>
		{#if error}<p class="err">{error}</p>{/if}

		{#if items.isLoading}
			<p class="muted">Loading…</p>
		{:else if (items.data ?? []).length === 0}
			<p class="muted">No items in {grade.trim()} yet.</p>
		{:else}
			<ul class="list">
				{#each items.data ?? [] as item (item._id)}
					<li>
						<span class="name">{item.product?.name ?? '—'}</span>
						<span class="price">{item.product ? fmtINR(item.product.salePrice) : ''}</span>
						<span class="qty-badge">×{item.quantity}</span>
						<Button
							size="sm"
							variant="ghost"
							onclick={() => dash.removeBundleItem({ itemId: item._id })}
						>
							Remove
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="muted">Enter or pick a grade to edit its bundle.</p>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.bundle {
		@apply grid gap-3 rounded-lg bg-neutral-50 p-4;
	}
	.bp-head {
		@apply grid gap-0.5;

		strong {
			@apply text-sm font-semibold text-neutral-900;
		}
		.bp-hint {
			@apply text-xs text-neutral-500;
		}
	}
	.bp-warn {
		@apply rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700;
	}
	.grades {
		@apply flex flex-wrap gap-2;
	}
	.chip {
		@apply inline-flex cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm hover:bg-neutral-100;
		&.active {
			@apply border-neutral-900 bg-neutral-900 text-white;
		}
		.count {
			@apply rounded-full bg-neutral-200 px-1.5 text-xs text-neutral-700;
		}
	}
	.controls {
		@apply flex flex-wrap items-center gap-2;
	}
	.in {
		@apply h-8 rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
	}
	.grade-in {
		@apply max-w-48;
	}
	.view {
		@apply ml-auto text-xs whitespace-nowrap text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline;
	}
	.qty {
		@apply w-20;
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
		.name {
			@apply min-w-0 flex-1 truncate;
		}
		.price {
			@apply text-neutral-500 tabular-nums;
		}
		.qty-badge {
			@apply rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700 tabular-nums;
		}
	}
</style>
