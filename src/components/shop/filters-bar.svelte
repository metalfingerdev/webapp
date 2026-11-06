<script lang="ts">
	import { ArrowDownUp, SlidersHorizontal, Check } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { useShopFilters, SORT_OPTIONS } from '$lib/shop/filters.svelte.js';

	const f = useShopFilters();

	const toNum = (v: string) => (v ? Number(v) : null);

	// The bar is two buttons; tapping one expands the bar upward (like the navbar
	// pill) to reveal that panel. Tapping the active one collapses it again.
	let panel = $state<'sort' | 'filters' | null>(null);
	let barEl = $state<HTMLElement>();

	const toggle = (p: 'sort' | 'filters') => (panel = panel === p ? null : p);
	const close = () => (panel = null);

	// Collapse on outside click / Escape, mirroring the navbar's dismiss behaviour.
	$effect(() => {
		if (!panel) return;

		const onClick = (e: MouseEvent) => {
			if (barEl && !barEl.contains(e.target as Node)) close();
		};
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();

		window.addEventListener('click', onClick);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('click', onClick);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<!-- Mobile (< md) only: two buttons docked flush to the bottom, over the grid.
     The fade strip sits directly above so the grid dissolves into the bar. -->
<div class="dock">
	<div class="fade" aria-hidden="true"></div>

	<div class="bar" bind:this={barEl}>
		{#if panel}
			<!-- `slide` grows the bar upward (bottom is pinned), same as the navbar menu. -->
			<div class="panel" transition:slide={{ duration: 240, easing: cubicOut }}>
				{#if panel === 'sort'}
					<ul class="options">
						{#each SORT_OPTIONS as opt (opt.value)}
							<li>
								<button
									type="button"
									class="option"
									class:active={f.sort === opt.value}
									onclick={() => {
										f.setSort(opt.value);
										close();
									}}
								>
									<span>{opt.label}</span>
									{#if f.sort === opt.value}<Check size={18} />{/if}
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="head">
						<span class="title">Filters</span>
						<button type="button" class="clear" onclick={() => f.clear()}>Clear all</button>
					</div>

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

					<label class="check">
						<input
							type="checkbox"
							checked={f.inStockOnly}
							onchange={(e) => f.setInStock(e.currentTarget.checked)}
						/>
						In stock only
					</label>
				{/if}
			</div>
		{/if}

		<div class="tabs">
			<button
				type="button"
				class="tab"
				class:active={panel === 'sort'}
				onclick={() => toggle('sort')}
			>
				<ArrowDownUp size={18} />
				Sort By
			</button>
			<span class="divider" aria-hidden="true"></span>
			<button
				type="button"
				class="tab"
				class:active={panel === 'filters'}
				onclick={() => toggle('filters')}
			>
				<SlidersHorizontal size={18} />
				Filters
			</button>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.dock {
		@apply pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col md:hidden;
	}

	/* Solid (white) where it meets the bar, fading up to transparent. */
	.fade {
		@apply pointer-events-none h-12 bg-linear-to-t from-white to-transparent;
	}

	.bar {
		@apply pointer-events-auto flex flex-col bg-white;
	}

	/* Expanded panel above the buttons. border-b separates it from the tab row. */
	.panel {
		@apply flex flex-col gap-3 border-b border-neutral-100 p-4 text-sm;
	}

	.tabs {
		@apply flex items-stretch;
	}

	.tab {
		@apply inline-flex flex-1 cursor-pointer items-center justify-center gap-2 py-4 text-sm font-medium text-neutral-800;

		&:active,
		&.active {
			@apply bg-neutral-100;
		}
	}

	.divider {
		@apply my-2 w-px bg-neutral-200;
	}

	/* ── Sort options ── */
	.options {
		@apply grid gap-1;

		.option {
			@apply flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-neutral-800 hover:bg-neutral-100;

			&.active {
				@apply font-medium text-neutral-900;
			}
		}
	}

	/* ── Filters ── */
	.head {
		@apply flex items-center justify-between;

		.title {
			@apply text-base font-semibold text-neutral-900;
		}

		.clear {
			@apply text-xs whitespace-nowrap text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline;
		}
	}

	fieldset {
		@apply flex flex-col gap-2;
	}

	legend {
		@apply font-medium text-neutral-700;
	}

	input[type='number'] {
		@apply w-full rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
	}

	.range {
		@apply flex items-center gap-2;
	}

	.check {
		@apply flex cursor-pointer items-center gap-2 font-medium text-neutral-700;

		input {
			@apply rounded border-neutral-300 text-neutral-900 focus:ring-0;
		}
	}
</style>
