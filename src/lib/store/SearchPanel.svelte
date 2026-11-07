<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { useQuery } from 'convex-svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import { api } from '#convex/_generated/api.js';
	import { formatPrice } from './format.js';
	import { strings } from './strings.js';

	// The search lives inside the navbar: the bar grows to hold the field, then grows and shrinks
	// smoothly with the results. (The old bar's idea, legacy/src/components/navbar/search-panel.svelte.)
	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	let { categories, onclose }: { categories: Category[]; onclose: () => void } = $props();

	let text = $state('');
	let field = $state<HTMLInputElement>();
	let panel = $state<HTMLElement>();
	const typed = $derived(text.trim());

	// Search after a short pause in typing, so a slow connection isn't sent every keystroke
	let query = $state('');
	$effect(() => {
		const next = typed;
		const timer = setTimeout(() => (query = next), 200);
		return () => clearTimeout(timer);
	});
	const searching = $derived(typed.length >= 2);
	const hits = useQuery(api.store.catalog.search, () =>
		query.length >= 2 ? { text: query, limit: 6 } : 'skip'
	);
	const loading = $derived(searching && (query !== typed || !hits.data));

	// Every category and section, for matching by name and labelling a product's category
	const allCategories = $derived(categories.flatMap((c) => [c, ...c.children]));
	const categoryName = $derived(new Map(allCategories.map((c) => [c.slug, c.name])));
	const categoryHits = $derived(
		searching
			? allCategories.filter((c) => c.name.toLowerCase().includes(typed.toLowerCase())).slice(0, 3)
			: []
	);
	const allResults = $derived(`${resolve('/(shop)/shop')}?q=${encodeURIComponent(typed)}`);

	// The words typed, marked where they appear in a title
	const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = $derived.by(() => {
		const words = typed.split(/\s+/).filter((word) => word.length >= 2);
		return words.length ? new RegExp(`(${words.map(escape).join('|')})`, 'gi') : null;
	});
	const parts = (title: string) =>
		pattern
			? title.split(pattern).map((part, i) => ({ part, match: i % 2 === 1 }))
			: [{ part: title, match: false }];

	// Recent searches stay on this device only. Storage can be missing or blocked: then there are none.
	const RECENT_KEY = 'aggarwalkart:recent-searches';
	// Read before the first frame (the panel only exists in the browser), so nothing pops in later
	const loadRecent = (): string[] => {
		try {
			const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
			return Array.isArray(saved) ? saved.filter((s) => typeof s === 'string').slice(0, 5) : [];
		} catch {
			return [];
		}
	};
	let recent = $state<string[]>(loadRecent());
	const saveRecent = (list: string[]) => {
		recent = list;
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(list));
		} catch {
			// not saved; the list still works for this visit
		}
	};
	const remember = () => {
		if (typed.length < 2) return;
		const lower = typed.toLowerCase();
		saveRecent([typed, ...recent.filter((s) => s.toLowerCase() !== lower)].slice(0, 5));
	};

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		if (!typed) return;
		remember();
		onclose();
		goto(allResults);
	};
	const clear = () => {
		text = '';
		field?.focus();
	};

	// Arrow keys move between the field and the results; Enter follows the focused one
	const onkeydown = (event: KeyboardEvent) => {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		if (!panel?.contains(document.activeElement)) return;
		const items = [...panel.querySelectorAll<HTMLElement>('[data-item]')];
		if (!items.length) return;
		event.preventDefault();
		const at = items.indexOf(document.activeElement as HTMLElement);
		if (event.key === 'ArrowDown') (items[at + 1] ?? items[0]).focus();
		else if (at <= 0) field?.focus();
		else items[at - 1].focus();
	};

	// One motion for everything: the panel's height follows its content, from 0 when it opens, and on
	// every change of the results after. The content is complete on the first frame, so it never staggers.
	let content = $state<HTMLElement>();
	let height = $state(0);
	$effect(() => {
		if (!content) return;
		const observer = new ResizeObserver(() => (height = content!.offsetHeight));
		observer.observe(content);
		return () => observer.disconnect();
	});

	$effect(() => field?.focus({ preventScroll: true }));

	// Closing collapses the same way
	const shrink = (node: Element) =>
		slide(node, {
			duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240,
			easing: cubicOut
		});
</script>

<svelte:window {onkeydown} />

<div
	class="search-panel"
	id="search-panel"
	role="search"
	bind:this={panel}
	style="height: {height}px"
	out:shrink
>
	<div class="inner" bind:this={content}>
		<form class="field" onsubmit={submit}>
			<SearchIcon class="size-5 shrink-0" aria-hidden="true" />
			<input
				bind:this={field}
				bind:value={text}
				type="search"
				enterkeyhint="search"
				autocomplete="off"
				aria-label={strings.search.label}
				placeholder={strings.search.placeholder}
			/>
			<!-- Always there, hidden while empty, so the field never changes size as you type -->
			<button
				class="clear"
				class:invisible={!text}
				type="button"
				aria-label={strings.search.clear}
				onclick={clear}
			>
				<XIcon class="size-4" aria-hidden="true" />
			</button>
		</form>

		<div class="results">
			<div aria-live="polite">
				{#if !searching}
					{#if recent.length}
						<div class="heading">
							<h2>{strings.search.recent}</h2>
							<button class="text-button" type="button" onclick={() => saveRecent([])}>
								{strings.search.clearRecent}
							</button>
						</div>
						<ul class="list">
							{#each recent as past (past)}
								<li>
									<a
										class="row"
										data-item
										href={`${resolve('/(shop)/shop')}?q=${encodeURIComponent(past)}`}
									>
										<ClockIcon class="size-4 text-text-muted" aria-hidden="true" />
										{past}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					<div class="heading"><h2>{strings.search.quickLinks}</h2></div>
					<ul class="list">
						{#each categories as category (category.slug)}
							<li>
								<a
									class="row"
									data-item
									href={resolve('/(shop)/shop/[category]', { category: category.slug })}
								>
									<ArrowRightIcon class="size-4 text-text-muted" aria-hidden="true" />
									{category.name}
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					{#if categoryHits.length}
						<ul class="list">
							{#each categoryHits as category (category.slug)}
								<li>
									<a
										class="row"
										data-item
										onclick={remember}
										href={resolve('/(shop)/shop/[category]', { category: category.slug })}
									>
										<LayoutGridIcon class="size-4 text-text-muted" aria-hidden="true" />
										<span>
											{#each parts(category.name) as { part, match }, i (i)}{#if match}<mark
														>{part}</mark
													>{:else}{part}{/if}{/each}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}

					{#if loading}
						<ul class="list" aria-hidden="true">
							{#each [0, 1, 2] as n (n)}
								<li class="hit">
									<span class="cover bone"></span>
									<span class="hit-text"
										><span class="bone">{strings.search.loadingTitle}</span></span
									>
								</li>
							{/each}
						</ul>
					{:else if (hits.data?.length ?? 0) === 0 && categoryHits.length === 0}
						<p class="quiet">{strings.search.noMatches(typed)}</p>
					{:else}
						<ul class="list">
							{#each hits.data ?? [] as hit (hit.id)}
								<li>
									<a
										class="hit"
										data-item
										onclick={remember}
										href={resolve('/(shop)/shop/[category]/[slug]', {
											category: hit.categorySlug,
											slug: hit.slug
										})}
									>
										<span class="cover">
											{#if hit.imageUrl}
												<img src={hit.imageUrl} alt="" width="36" height="48" loading="lazy" />
											{:else}
												<BookOpenIcon class="size-4 text-text-muted" aria-hidden="true" />
											{/if}
										</span>
										<span class="hit-text">
											<span class="hit-title">
												{#each parts(hit.title) as { part, match }, i (i)}{#if match}<mark
															>{part}</mark
														>{:else}{part}{/if}{/each}
											</span>
											<span class="quiet">{hit.author ?? categoryName.get(hit.categorySlug)}</span>
										</span>
										<span class="hit-price">{formatPrice(hit.price)}</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}

					<a class="row strong" data-item onclick={remember} href={allResults}>
						{strings.search.seeAllFor(typed)}
						<ArrowRightIcon class="size-4" aria-hidden="true" />
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	/* w-0 min-w-full: as wide as the bar, never wider. Its height is set from .inner, so the padding
	   lives on .inner too. */
	.search-panel {
		@apply w-0 min-w-full overflow-hidden;
		transition: height 240ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.inner {
		@apply flex flex-col px-1 pb-2 md:px-3;
	}
	.field {
		@apply flex items-center gap-3 border-b border-border-muted px-2 text-text-muted;

		input {
			@apply min-h-13 w-full bg-transparent text-lg text-text outline-none placeholder:text-text-muted md:text-xl;

			/* the field has its own clear button */
			&::-webkit-search-cancel-button {
				appearance: none;
			}
		}
	}
	.clear {
		@apply grid size-9 shrink-0 place-items-center rounded-full bg-midground text-text;
	}
	.results {
		@apply max-h-[min(65dvh,34rem)] overflow-y-auto overscroll-contain;
	}
	.results {
		> div {
			@apply flex flex-col gap-1 pt-2;
		}
	}
	.heading {
		@apply flex items-center justify-between px-2 pt-2;

		h2 {
			@apply text-xs font-bold text-text-muted;
		}
	}
	.text-button {
		@apply min-h-9 px-2 text-xs font-bold text-primary;
	}
	.list {
		@apply flex flex-col;
	}
	.row,
	.hit {
		@apply flex min-h-11 items-center gap-3 rounded-xl px-2 transition-colors outline-none hover:bg-midground focus-visible:bg-midground;
	}
	.hit {
		@apply min-h-15 py-1.5;
	}
	.cover {
		@apply grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-midground;

		img {
			@apply size-full object-cover;
		}
	}
	.hit-text {
		@apply flex min-w-0 flex-1 flex-col;
	}
	.hit-title {
		@apply line-clamp-1 font-bold;
	}
	.hit-price {
		@apply shrink-0 font-bold tabular-nums;
	}
	mark {
		@apply rounded-sm bg-primary-tint text-inherit;
	}
	.strong {
		@apply font-bold text-primary;
	}
	.quiet {
		@apply line-clamp-1 text-sm text-text-muted;

		&:is(p) {
			@apply px-2 py-3;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.search-panel {
			transition: none;
		}
	}
</style>
