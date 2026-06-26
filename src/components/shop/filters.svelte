<script lang="ts">
	// Prototype filter panel. Local state only for now — once we settle on the
	// final set of controls, lift this into the URL (search params) so filters
	// are shareable/SSR-friendly like the rest of /shop.
	let sort = $state('relevance');
	let inStockOnly = $state(false);
	let minPrice = $state<number | null>(null);
	let maxPrice = $state<number | null>(null);

	const sortOptions = [
		{ value: 'relevance', label: 'Relevance' },
		{ value: 'price-asc', label: 'Price: Low to High' },
		{ value: 'price-desc', label: 'Price: High to Low' },
		{ value: 'newest', label: 'Newest' }
	];

	const clear = () => {
		sort = 'relevance';
		inStockOnly = false;
		minPrice = null;
		maxPrice = null;
	};
</script>

<form class="filters" onsubmit={(e) => e.preventDefault()}>
	<div class="head">
		<h2>Filters</h2>
		<button type="button" class="clear" onclick={clear}>Clear all</button>
	</div>

	<fieldset>
		<label for="sort">Sort by</label>
		<select id="sort" bind:value={sort}>
			{#each sortOptions as opt (opt.value)}
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
				bind:value={minPrice}
				aria-label="Minimum price"
			/>
			<span aria-hidden="true">–</span>
			<input
				type="number"
				min="0"
				placeholder="Max"
				bind:value={maxPrice}
				aria-label="Maximum price"
			/>
		</div>
	</fieldset>

	<fieldset>
		<label class="check">
			<input type="checkbox" bind:checked={inStockOnly} />
			In stock only
		</label>
	</fieldset>
</form>

<style lang="postcss">
	@reference "src/app.css";

	.filters {
		@apply flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm;
	}

	.head {
		@apply flex items-center justify-between;

		h2 {
			@apply text-base font-semibold text-neutral-900;
		}

		.clear {
			@apply text-xs text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline;
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
