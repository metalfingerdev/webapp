<script lang="ts">
	// Breadcrumbs moved into the navbar pill (nav-breadcrumbs.svelte). Filters are
	// split into two purpose-built components — a desktop sidebar and a mobile
	// bottom bar — sharing state via the filters context (initialised here).
	import { initShopFilters } from '$lib/shop/filters.svelte.js';
	import FiltersSidebar from '$components/shop/filters-sidebar.svelte';
	import FiltersBar from '$components/shop/filters-bar.svelte';

	let { children } = $props();

	initShopFilters();
</script>

<div class="shop">
	<FiltersSidebar />

	<!-- Scroll container for the product grid. -->
	<main class="content">
		{@render children()}
	</main>

	<FiltersBar />
</div>

<style lang="postcss">
	@reference "src/app.css";

	.shop {
		@apply flex h-dvh overflow-hidden;
	}

	/* The scroll container. Top padding clears the floating navbar pill (taller on
	   /shop now that it carries the breadcrumb trail); the extra bottom padding on
	   mobile keeps the last row clear of the docked filter bar. */
	.content {
		@apply flex-1 overflow-y-auto px-4 pt-24 pb-28 md:pb-6;
	}
</style>
