<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useConvexClient } from 'convex-svelte';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { api } from '#convex/_generated/api.js';
	import type { ProductCard } from '#convex/model/store/publicProjection.js';
	import UserButton from '#lib/users/ui/UserButton.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { formatPrice } from './format.js';
	import { strings } from './strings.js';

	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	let {
		categories,
		schools,
		initialData
	}: {
		categories: Category[];
		schools: { name: string; slug: string }[];
		initialData?: Parameters<typeof UserButton>[1]['initialData'];
	} = $props();

	let menuOpen = $state(false);
	let searchOpen = $state(false);
	let text = $state('');
	let results = $state<ProductCard[] | null>(null);
	let searching = $state(false);

	// Close either panel when the visitor moves to another page
	$effect(() => {
		void page.url.pathname;
		menuOpen = false;
		searchOpen = false;
	});

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
		if (typed) goto(`${resolve('/(shop)/shop')}?q=${encodeURIComponent(typed)}`);
	};
</script>

<header class="bar-wrap">
	<nav class="bar" aria-label="Main">
		<button
			class="icon-button"
			type="button"
			aria-label={strings.nav.menu}
			onclick={() => (menuOpen = true)}
		>
			<MenuIcon class="size-6" aria-hidden="true" />
		</button>
		<a class="brand" href={resolve('/(shop)')}>{strings.brand}</a>
		<div class="end">
			<button
				class="icon-button"
				type="button"
				aria-label={strings.nav.search}
				onclick={() => (searchOpen = true)}
			>
				<SearchIcon class="size-6" aria-hidden="true" />
			</button>
			<UserButton {initialData} />
		</div>
	</nav>
</header>

<Sheet bind:open={menuOpen} title={strings.nav.menu} closeLabel={strings.nav.close}>
	<div class="mega">
		<section>
			<h2 class="heading">{strings.nav.categories}</h2>
			<ul class="links">
				<li><a href={resolve('/(shop)/shop')}>{strings.nav.allProducts}</a></li>
				{#each categories as category (category.slug)}
					<li>
						<a
							class="strong"
							href={resolve('/(shop)/shop/[category]', { category: category.slug })}
						>
							{category.name}
						</a>
						{#if category.children.length}
							<ul class="sub">
								{#each category.children as child (child.slug)}
									<li>
										<a href={resolve('/(shop)/shop/[category]', { category: child.slug })}
											>{child.name}</a
										>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
		<section>
			<h2 class="heading">{strings.nav.schools}</h2>
			<!-- Step 3 turns these into links to each school's sets -->
			<ul class="links">
				{#each schools as school (school.slug)}<li class="plain">{school.name}</li>{/each}
			</ul>
			<p class="note">{strings.nav.schoolsSoon}</p>
		</section>
		<a class="strong" href={resolve('/account')}>{strings.nav.account}</a>
	</div>
</Sheet>

<Sheet bind:open={searchOpen} title={strings.search.title} closeLabel={strings.nav.close}>
	<form class="search" onsubmit={submit} role="search">
		<label class="field-label">
			<span class="field-caption">{strings.search.label}</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="control"
				type="search"
				bind:value={text}
				placeholder={strings.search.placeholder}
				autofocus
			/>
		</label>
	</form>
	{#if searching && !results}
		<p class="note">{strings.search.searching}</p>
	{:else if results}
		{#if results.length === 0}
			<p class="note">{strings.search.none}</p>
		{:else}
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
			<a class="strong" href={`${resolve('/(shop)/shop')}?q=${encodeURIComponent(text.trim())}`}>
				{strings.search.seeAll}
			</a>
		{/if}
	{/if}
</Sheet>

<style lang="postcss">
	@reference 'src/app.css';

	.bar-wrap {
		@apply sticky top-0 z-30 px-3 pt-3;
	}
	.bar {
		--fill: var(--color-foreground);
		@apply mx-auto flex max-w-6xl items-center gap-2 rounded-2xl bg-foreground px-2 py-1.5 edge;
	}
	.brand {
		@apply flex-1 text-lg font-extrabold text-primary;
	}
	.end {
		@apply flex items-center gap-1;
	}
	.icon-button {
		@apply grid size-11 place-items-center rounded-lg;
	}
	.mega {
		@apply grid gap-5 md:gap-6;
	}
	.heading {
		@apply mb-1 text-xs font-extrabold tracking-wide text-text-muted uppercase;
	}
	.links {
		@apply flex flex-col;
	}
	.links a,
	.plain {
		@apply flex min-h-11 items-center;
	}
	.strong {
		@apply flex min-h-11 items-center font-bold;
	}
	.sub {
		@apply mb-1 ml-3 flex flex-col border-l-2 border-border-muted pl-3 text-sm;
	}
	.note {
		@apply text-sm text-text-muted;
	}
	.hits {
		@apply flex flex-col;
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
</style>
