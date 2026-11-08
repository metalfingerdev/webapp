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
			<label class="field">
				<span class="caption">{strings.shop.filterSchool}</span>
				<select name="school">
					<option value="">{strings.shop.filterAnySchool}</option>
					{#each schools as school (school.slug)}
						<option value={school.slug} selected={sp.get('school') === school.slug}>
							{school.name}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		<label class="field">
			<span class="caption">{strings.shop.filterClass}</span>
			<select name="class">
				<option value="">{strings.shop.filterAnyClass}</option>
				{#each classes as level (level)}
					<option value={level} selected={sp.get('class') === String(level)}>
						{CLASS_LABELS[level]}
					</option>
				{/each}
			</select>
		</label>
		<label class="field">
			<span class="caption">{strings.shop.filterMin}</span>
			<input name="min" type="number" min="0" inputmode="numeric" value={sp.get('min') ?? ''} />
		</label>
		<label class="field">
			<span class="caption">{strings.shop.filterMax}</span>
			<input name="max" type="number" min="0" inputmode="numeric" value={sp.get('max') ?? ''} />
		</label>
		<label class="check">
			<input type="checkbox" name="stock" value="1" checked={sp.get('stock') === '1'} />
			{strings.shop.filterInStock}
		</label>
		<div class="actions">
			<button class="apply" type="submit">{strings.shop.apply}</button>
			{#if filtersActive}
				<button class="clear" type="button" onclick={clear}>{strings.shop.clear}</button>
			{/if}
		</div>
	</form>
{/snippet}

<div class="listing">
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
</div>

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
				<ListFilterIcon size={20} aria-hidden="true" />
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
			<ArrowUpDownIcon size={20} aria-hidden="true" />
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

	div.listing {
		ul.grid {
			@apply grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5;
		}
		div.more {
			@apply mt-8 flex justify-center;
		}
		/* Both labels share one cell, so the button never changes width */
		span.swap {
			@apply grid;

			> span {
				@apply col-start-1 row-start-1;

				&.gone {
					@apply invisible;
				}
			}
		}
	}

	/* Room for the dock, so the last row is never hidden behind it */
	div.dock-space {
		@apply h-24;
	}

	/* Fixed to the bottom. The top edge fades from the page colour to nothing, so products slide
	   under it softly; only the buttons take taps, the faded strip lets them through. */
	div.dock {
		@apply pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pt-10 pb-4;
		background: linear-gradient(to top, var(--background) 40%, transparent);

		div.dock-bar {
			@apply pointer-events-auto flex gap-1.5 rounded-full floating p-1.5;
		}
		button.dock-button {
			@apply flex min-h-11 items-center gap-2 rounded-full px-5 font-bold;

			&:hover {
				@apply sunken;
			}
		}
		span.dot {
			@apply grid size-5 place-items-center rounded-full raised-primary text-xs leading-none text-foreground tabular-nums;
		}
	}

	/* The filter form, inside its sheet */
	form.filter-form {
		@apply grid gap-4 sm:grid-cols-2;

		label.field {
			@apply field-label;

			span.caption {
				@apply field-caption;
			}
			:is(select, input) {
				@apply control min-h-11 rounded-xl border-0;
			}
		}
		label.check {
			@apply flex min-h-11 items-center gap-3 text-sm font-bold;

			input {
				@apply size-5 rounded-md border-0 sunken text-primary;
			}
		}
		div.actions {
			@apply flex flex-wrap gap-2 sm:col-span-2;

			button {
				@apply button min-h-11;

				&.apply {
					@apply tone-primary;
				}
			}
		}
	}

	/* The sort choices, inside their sheet */
	ul.sorts {
		@apply flex flex-col gap-2;

		button.sort-option {
			@apply min-h-12 w-full press rounded-full raised px-5 text-left font-bold;

			&.current {
				@apply raised-primary text-foreground;
			}
		}
	}
	p.note {
		@apply text-sm text-text-muted;
	}
</style>
