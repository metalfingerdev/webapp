<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { useConvexClient } from 'convex-svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { api } from '#convex/_generated/api.js';
	import type { ProductCard } from '#convex/model/store/publicProjection.js';
	import { formatPrice } from './format.js';
	import { strings } from './strings.js';

	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	let { categories, onclose }: { categories: Category[]; onclose: () => void } = $props();

	let text = $state('');
	let results = $state<ProductCard[] | null>(null);
	let searching = $state(false);
	let input = $state<HTMLInputElement>();

	// The first column is the top-level categories; the second is the sections of the first one
	const popular = $derived(categories[0]?.children.slice(0, 4) ?? []);

	$effect(() => input?.focus({ preventScroll: true }));

	// Search as they type, after a short pause; a newer search replaces an older one
	const client = useConvexClient();
	let latest = 0;
	$effect(() => {
		const typed = text.trim();
		if (typed.length < 2) {
			results = null;
			return;
		}
		const run = ++latest;
		const timer = setTimeout(async () => {
			searching = true;
			try {
				const found = await client.query(api.store.catalog.search, { text: typed, limit: 6 });
				if (run === latest) results = found;
			} finally {
				if (run === latest) searching = false;
			}
		}, 250);
		return () => clearTimeout(timer);
	});

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		const typed = text.trim();
		if (!typed) return;
		onclose();
		goto(`${resolve('/(shop)/shop')}?q=${encodeURIComponent(typed)}`);
	};
</script>

<div class="search">
	<form class="field" onsubmit={submit} role="search">
		<SearchIcon class="size-6 shrink-0 text-text-muted" aria-hidden="true" />
		<input
			bind:this={input}
			bind:value={text}
			type="search"
			aria-label={strings.search.label}
			placeholder={strings.search.placeholder}
		/>
	</form>

	{#if text.trim().length >= 2}
		{#if searching && !results}
			<p class="note">{strings.search.searching}</p>
		{:else if results?.length === 0}
			<p class="note">{strings.search.none}</p>
		{:else if results}
			<ul class="hits">
				{#each results as hit (hit.id)}
					<li>
						<a
							href={resolve('/(shop)/shop/[category]/[slug]', {
								category: hit.categorySlug,
								slug: hit.slug
							})}
						>
							<span class="hit-title">{hit.title}</span>
							<span class="hit-price">{formatPrice(hit.price)}</span>
						</a>
					</li>
				{/each}
			</ul>
			<a class="all" href={`${resolve('/(shop)/shop')}?q=${encodeURIComponent(text.trim())}`}>
				{strings.search.seeAll}
			</a>
		{/if}
	{:else}
		<div class="columns">
			<div>
				<h2 class="heading">{strings.nav.browse}</h2>
				<ul class="links">
					<li><a href={resolve('/(shop)/shop')}>{strings.nav.allProducts}</a></li>
					{#each categories as category (category.slug)}
						<li>
							<a href={resolve('/(shop)/shop/[category]', { category: category.slug })}>
								{category.name}
							</a>
						</li>
					{/each}
				</ul>
			</div>
			{#if popular.length}
				<div>
					<h2 class="heading">{strings.nav.popular}</h2>
					<ul class="links">
						{#each popular as child (child.slug)}
							<li>
								<a href={resolve('/(shop)/shop/[category]', { category: child.slug })}
									>{child.name}</a
								>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.search {
		@apply flex flex-col gap-4 p-4 md:p-8;
	}
	.field {
		@apply flex items-center gap-3 border-b-2 border-border-muted pb-2;
	}
	.field input {
		@apply min-h-12 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-text-muted md:text-3xl;
	}
	.columns {
		@apply grid gap-6 sm:grid-cols-2;
	}
	.heading {
		@apply mb-1 text-xs font-extrabold tracking-wide text-text-muted uppercase;
	}
	.links a,
	.all {
		@apply flex min-h-11 items-center text-lg font-bold;
	}
	.hits a {
		@apply flex min-h-12 items-center justify-between gap-3 border-b-2 border-border-muted;
	}
	.hit-title {
		@apply line-clamp-2 font-bold;
	}
	.hit-price {
		@apply shrink-0 text-sm;
	}
	.note {
		@apply text-text-muted;
	}
</style>
