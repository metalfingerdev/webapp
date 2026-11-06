<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { ProductCard as Card } from '#convex/model/store/publicProjection.js';
	import { CLASS_LABELS, FIRST_CLASS, LAST_CLASS } from '#convex/model/store/classes.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import ProductCard from './ProductCard.svelte';
	import { strings } from './strings.js';

	type Listing = {
		q: string;
		products: Card[];
		isDone: boolean;
		cursor: string | null;
		args: {
			categorySlug?: string;
			classLevel?: number;
			minPrice?: number;
			maxPrice?: number;
			inStockOnly?: boolean;
		} | null;
	};
	let { listing }: { listing: Listing } = $props();

	const client = useConvexClient();
	const classes = Array.from({ length: LAST_CLASS - FIRST_CLASS + 1 }, (_, i) => FIRST_CLASS + i);

	// "Show more" pages are kept here; a new URL (a new filter) brings a new first page
	let more = $state<Card[]>([]);
	let cursor = $state<string | null>(null);
	let isDone = $state(true);
	let loading = $state(false);
	$effect(() => {
		more = [];
		cursor = listing.cursor;
		isDone = listing.isDone;
	});
	const products = $derived([...listing.products, ...more]);

	const showMore = async () => {
		if (!listing.args || loading || cursor === null) return;
		loading = true;
		try {
			const result = await client.query(api.store.catalog.listProducts, {
				...listing.args,
				paginationOpts: { numItems: 24, cursor }
			});
			more = [...more, ...result.page];
			cursor = result.continueCursor;
			isDone = result.isDone;
		} finally {
			loading = false;
		}
	};

	// Filters live in the URL, so a plain GET form works before any script has loaded
	const sp = $derived(page.url.searchParams);
	const filtersActive = $derived(['class', 'min', 'max', 'stock'].some((key) => sp.has(key)));
	const clear = () => goto(page.url.pathname);
</script>

{#if !listing.q}
	<details class="filters" open={filtersActive}>
		<summary>{strings.shop.filters}</summary>
		<form method="GET" class="filter-form">
			<label class="field-label">
				<span class="field-caption">{strings.shop.filterClass}</span>
				<select class="control" name="class">
					<option value="">{strings.shop.filterAnyClass}</option>
					{#each classes as level (level)}
						<option value={level} selected={sp.get('class') === String(level)}>
							{CLASS_LABELS[level]}
						</option>
					{/each}
				</select>
			</label>
			<label class="field-label">
				<span class="field-caption">{strings.shop.filterMin}</span>
				<input
					class="control"
					name="min"
					type="number"
					min="0"
					inputmode="numeric"
					value={sp.get('min') ?? ''}
				/>
			</label>
			<label class="field-label">
				<span class="field-caption">{strings.shop.filterMax}</span>
				<input
					class="control"
					name="max"
					type="number"
					min="0"
					inputmode="numeric"
					value={sp.get('max') ?? ''}
				/>
			</label>
			<label class="check">
				<input type="checkbox" name="stock" value="1" checked={sp.get('stock') === '1'} />
				{strings.shop.filterInStock}
			</label>
			<div class="actions">
				<button class="button tone-primary" type="submit">{strings.shop.apply}</button>
				{#if filtersActive}
					<button class="button" type="button" onclick={clear}>{strings.shop.clear}</button>
				{/if}
			</div>
		</form>
	</details>
{/if}

{#if products.length === 0 && isDone}
	<Notice tone="info">{strings.shop.empty}</Notice>
{:else}
	<ul class="grid">
		{#each products as product (product.id)}
			<li><ProductCard {product} /></li>
		{/each}
	</ul>
	{#if !isDone}
		<div class="more">
			<Button onclick={showMore} disabled={loading}>
				{loading ? strings.shop.loading : strings.shop.showMore}
			</Button>
		</div>
	{/if}
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.filters {
		@apply mb-4 panel p-3;
	}
	.filters summary {
		@apply min-h-11 cursor-pointer content-center font-bold;
	}
	.filter-form {
		@apply mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4;
	}
	.check {
		@apply flex min-h-11 items-center gap-2 text-sm font-bold;
	}
	.check input {
		@apply size-5;
	}
	.actions {
		@apply flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4;
	}
	.grid {
		@apply grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5;
	}
	.more {
		@apply mt-6 flex justify-center;
	}
</style>
