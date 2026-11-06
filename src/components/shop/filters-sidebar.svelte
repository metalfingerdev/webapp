<script lang="ts">
	import { useShopFilters, SORT_OPTIONS, type SortValue } from '$lib/shop/filters.svelte.js';

	const f = useShopFilters();

	const toNum = (v: string) => (v ? Number(v) : null);
</script>

<!-- Desktop / tablet: a static left rail. Hidden below md (the bottom bar takes
     over there). Built purely for this layout — no responsive overrides. -->
<aside class="sidebar">
	<form class="filters" onsubmit={(e) => e.preventDefault()}>
		<div class="head">
			<h2>Filters</h2>
			<button type="button" class="clear" onclick={() => f.clear()}>Clear all</button>
		</div>

		<fieldset>
			<label for="sort">Sort by</label>
			<select
				id="sort"
				value={f.sort}
				onchange={(e) => f.setSort(e.currentTarget.value as SortValue)}
			>
				{#each SORT_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</fieldset>

		<fieldset>
			<legend>Price</legend>
			<div class="range">
				<input
					type="number"
					min="0"
					placeholder="Min"
					value={f.minPrice ?? ''}
					onchange={(e) => f.setMin(toNum(e.currentTarget.value))}
					aria-label="Minimum price"
				/>
				<span aria-hidden="true">–</span>
				<input
					type="number"
					min="0"
					placeholder="Max"
					value={f.maxPrice ?? ''}
					onchange={(e) => f.setMax(toNum(e.currentTarget.value))}
					aria-label="Maximum price"
				/>
			</div>
		</fieldset>

		<fieldset>
			<label class="check">
				<input
					type="checkbox"
					checked={f.inStockOnly}
					onchange={(e) => f.setInStock(e.currentTarget.checked)}
				/>
				In stock only
			</label>
		</fieldset>
	</form>
</aside>

<style lang="postcss">
	@reference 'src/app.css';

	/* hidden on mobile; a flex column rail from md up. pt-24 clears the floating
	   navbar pill. */
	.sidebar {
		@apply hidden h-full w-64 shrink-0 overflow-y-auto border-r border-neutral-200 px-4 pt-24 pb-4 md:block;
	}

	.filters {
		@apply flex flex-col gap-4 text-sm;
	}

	.head {
		@apply flex items-center justify-between;

		h2 {
			@apply text-base font-semibold text-neutral-900;
		}

		.clear {
			@apply text-xs whitespace-nowrap text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline;
		}
	}

	fieldset {
		@apply flex flex-col gap-2 border-t border-neutral-100 pt-4;
	}

	label,
	legend {
		@apply font-medium text-neutral-700;
	}

	select,
	input[type='number'] {
		@apply w-full rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
	}

	.range {
		@apply flex items-center gap-2;
	}

	.check {
		@apply flex cursor-pointer items-center gap-2 font-normal text-neutral-700;

		input {
			@apply rounded border-neutral-300 text-neutral-900 focus:ring-0;
		}
	}
</style>
