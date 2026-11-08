<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { ProductCard as Card } from '#convex/model/store/publicProjection.js';
	import { CLASS_LABELS, FIRST_CLASS, LAST_CLASS } from '#convex/model/store/classes.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import ListFilterIcon from '@lucide/svelte/icons/list-filter';
	import ProductCard from './ProductCard.svelte';
	import { strings } from './strings.js';

	type Listing = {
		q: string;
		products: Card[];
		isDone: boolean;
		cursor: string | null;
		args: {
			categorySlug?: string;
			schoolSlug?: string;
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
	const FILTER_KEYS = ['school', 'class', 'min', 'max', 'stock'];
	const filtersActive = $derived(FILTER_KEYS.some((key) => sp.has(key)));
	// The schools come with the shop layout (the menu lists them too)
	const schools = $derived((page.data.schools ?? []) as { name: string; slug: string }[]);
	const clear = () => goto(page.url.pathname);

	// Sorting applies to the products loaded so far: price lives on the variants, so the server
	// cannot order a page by it yet. The choice is kept in the address like the filters.
	const SORTS = ['new', 'price-asc', 'price-desc', 'title'] as const;
	type Sort = (typeof SORTS)[number];
	const sortLabels: Record<Sort, string> = {
		new: strings.shop.sortNew,
		'price-asc': strings.shop.sortPriceAsc,
		'price-desc': strings.shop.sortPriceDesc,
		title: strings.shop.sortTitleAz
	};
	const sort = $derived<Sort>(SORTS.find((key) => key === sp.get('sort')) ?? 'new');
	const sorted = $derived(
		sort === 'new'
			? products
			: [...products].sort((a, b) =>
					sort === 'price-asc'
						? a.price - b.price
						: sort === 'price-desc'
							? b.price - a.price
							: a.title.localeCompare(b.title, 'en-IN')
				)
	);
	const chooseSort = (key: Sort) => {
		const params = new URLSearchParams(page.url.search);
		if (key === 'new') params.delete('sort');
		else params.set('sort', key);
		sortOpen = false;
		goto(`?${params}`);
	};

	let filterOpen = $state(false);
	let sortOpen = $state(false);
	const activeCount = $derived(FILTER_KEYS.filter((k) => sp.has(k)).length);
</script>

{#snippet filterForm()}
	<form method="GET" class="filter-form">
		{#if sort !== 'new'}<input type="hidden" name="sort" value={sort} />{/if}
		{#if schools.length}
			<label class="field-label">
				<span class="field-caption">{strings.shop.filterSchool}</span>
				<select class="control" name="school">
					<option value="">{strings.shop.filterAnySchool}</option>
					{#each schools as school (school.slug)}
						<option value={school.slug} selected={sp.get('school') === school.slug}>
							{school.name}
						</option>
					{/each}
				</select>
			</label>
		{/if}
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
{/snippet}

{#if products.length === 0 && isDone}
	<Notice tone="info">{strings.shop.empty}</Notice>
{:else}
	<ul class="grid">
		{#each sorted as product (product.id)}
			<li><ProductCard {product} /></li>
		{/each}
	</ul>
	{#if !isDone}
		<div class="more">
			<Button onclick={showMore} disabled={loading} aria-busy={loading}>
				<!-- Both labels share one cell, so the button never changes width -->
				<span class="swap">
					<span class:gone={loading}>{strings.shop.showMore}</span>
					<span class:gone={!loading}>{strings.shop.loading}</span>
				</span>
			</Button>
		</div>
	{/if}
{/if}

<!-- Filter and sort stay at the bottom, in thumb reach. The page fades into the dock's background. -->
<div class="dock-space" aria-hidden="true"></div>
<div class="dock">
	<div class="dock-bar">
		{#if !listing.q}
			<button
				class="dock-button"
				type="button"
				aria-haspopup="dialog"
				aria-label={activeCount ? strings.shop.filtersActive(activeCount) : undefined}
				onclick={() => (filterOpen = true)}
			>
				<ListFilterIcon class="size-5" aria-hidden="true" />
				{strings.shop.filters}
				{#if activeCount}<span class="dot" aria-hidden="true">{activeCount}</span>{/if}
			</button>
		{/if}
		<button
			class="dock-button"
			type="button"
			aria-haspopup="dialog"
			onclick={() => (sortOpen = true)}
		>
			<ArrowUpDownIcon class="size-5" aria-hidden="true" />
			{strings.shop.sort}
			{#if sort !== 'new'}<span class="dot" aria-hidden="true">1</span>{/if}
		</button>
	</div>
</div>

<Sheet bind:open={filterOpen} title={strings.shop.filters} closeLabel={strings.nav.close}>
	{@render filterForm()}
</Sheet>
<Sheet bind:open={sortOpen} title={strings.shop.sortTitle} closeLabel={strings.nav.close}>
	<ul class="sorts">
		{#each SORTS as key (key)}
			<li>
				<button
					class="sort-option"
					class:current={key === sort}
					type="button"
					aria-pressed={key === sort}
					onclick={() => chooseSort(key)}
				>
					{sortLabels[key]}
				</button>
			</li>
		{/each}
	</ul>
	<p class="note">{strings.shop.sortNote}</p>
</Sheet>

<style lang="postcss">
	@reference 'src/app.css';

	.filter-form {
		@apply grid gap-3 sm:grid-cols-2;
	}

	.check {
		@apply flex min-h-11 items-center gap-2 text-sm font-bold;

		input {
			@apply size-5;
		}
	}

	.actions {
		@apply flex flex-wrap gap-2 sm:col-span-2;
	}

	/* Room for the dock, so the last row is never hidden behind it */
	.dock-space {
		@apply h-24;
	}

	/* Fixed to the bottom. The top edge fades from the page colour to nothing, so products slide
	   under it softly; only the buttons take taps, the faded strip lets them through. */
	.dock {
		@apply pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pt-10 pb-4;
		background: linear-gradient(to top, var(--color-background) 40%, transparent);
	}

	.dock-bar {
		@apply pointer-events-auto flex gap-2 rounded-full bg-foreground p-1 shadow-lg;
	}

	.dock-button {
		@apply flex min-h-11 items-center gap-2 rounded-full px-5 font-bold;

		&:hover {
			@apply bg-midground;
		}
	}

	.dot {
		@apply grid size-5 place-items-center rounded-full bg-primary text-xs leading-none text-foreground tabular-nums;
	}

	.sorts {
		@apply flex flex-col gap-1;
	}

	.sort-option {
		@apply min-h-11 w-full rounded-lg px-3 text-left font-bold;

		&.current {
			@apply bg-foreground text-primary;
		}
	}

	.note {
		@apply text-sm text-text-muted;
	}

	.grid {
		@apply grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5;
	}

	.more {
		@apply mt-6 flex justify-center;
	}

	.swap {
		@apply grid;

		> span {
			@apply col-start-1 row-start-1;
		}
	}

	.gone {
		@apply invisible;
	}
</style>
