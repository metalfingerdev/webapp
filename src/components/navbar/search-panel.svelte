<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';

	const nav = useNavbar();
	const quickColumns = [
		{
			heading: 'Popular',
			items: [
				{ label: 'NCERT Books', href: '/shop/book' },
				{ label: 'School Uniforms', href: '/shop/clothes' },
				{ label: 'Notebooks', href: '/shop/stationary' },
				{ label: 'Geometry Boxes', href: '/shop/stationary' }
			]
		},
		{
			heading: 'Browse',
			items: [
				{ label: 'Books', href: '/shop/book' },
				{ label: 'Uniforms', href: '/shop/clothes' },
				{ label: 'Stationary', href: '/shop/stationary' },
				{ label: 'All Products', href: '/shop' }
			]
		}
	];

	const suggestions = useQuery(api.products.searchProducts, () =>
		nav.searchTerm.trim() ? { term: nav.searchTerm } : 'skip'
	);

	$effect(() => {
		// preventScroll: focusing the input while the pill is mid-slide (its height
		// is ~0 and overflow is hidden) would otherwise make the browser scroll the
		// panel to reveal the input, then unwind as it grows — which reads as the
		// field drifting down. Keep focus, skip the scroll.
		if (nav.isSearchOpen) nav.searchInputRef?.focus({ preventScroll: true });
	});
</script>

{#if nav.isSearchOpen}
	<!-- Mounted only while open; `slide` animates the real measured height (and
	     padding) so the <menu> pill grows/shrinks with no residual strip. -->
	<div class="search-panel" transition:slide={{ duration: 240, easing: cubicOut }}>
		<form
			class="search-field"
			onsubmit={(e) => {
				e.preventDefault();
				nav.submitSearch();
			}}
		>
			<Search size={18} />
			<input
				bind:this={nav.searchInputRef}
				bind:value={nav.searchTerm}
				type="search"
				placeholder="Search for books, uniforms, stationery..."
				onkeydown={(e) => {
					if (e.key === 'Escape') nav.closeSearch();
				}}
			/>
		</form>

		{#if nav.searchTerm.trim()}
			<ul class="suggestions">
				{#each suggestions.data ?? [] as s (s._id)}
					<li>
						<a href="/shop/{s.category}/{s.slug}" onclick={nav.closeSearch}>
							<span>{s.name}</span>
							<span class="cat">{s.category}</span>
						</a>
					</li>
				{/each}
				{#if (suggestions.data?.length ?? 0) === 0 && !suggestions.isLoading}
					<li class="empty">No matches for "{nav.searchTerm}".</li>
				{/if}
			</ul>
		{:else}
			<div class="quick-columns">
				{#each quickColumns as col (col.heading)}
					<div class="col">
						<h5>{col.heading}</h5>
						<ul>
							{#each col.items as item (item.label)}
								<li><a href={item.href} onclick={nav.closeSearch}>{item.label}</a></li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	/* Layout-only wrapper — no chrome of its own; the menu's pill is the only
	   visible container. Mounted only while open (see {#if} above), so it adds
	   no footprint when closed; `slide` animates its height + padding.
	   w-0 + min-w-full: fill the pill's width (set by the nav row) without ever
	   widening it, so opening search doesn't grow/recenter the pill and shift the
	   row above. */
	.search-panel {
		@apply flex w-0 min-w-full flex-col gap-2 p-2;

		/* Leading icon sits inside the field, beside the input. */
		.search-field {
			@apply flex items-center gap-2 rounded-lg border px-3 py-2 text-neutral-500;
		}

		input {
			/* border-0 drops @tailwindcss/forms' default input border; only the
			   wrapper (.search-field) shows a container. */
			@apply w-full border-0 bg-transparent text-neutral-900 outline-none;

			/* …and kill its box-shadow focus ring too. */
			&:focus {
				box-shadow: none;
			}
		}

		.quick-columns {
			@apply flex gap-8;
		}
	}
</style>
