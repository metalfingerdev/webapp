<script lang="ts">
	import { resolve } from '$app/paths';
	import ProductListing from '#lib/store/ProductListing.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const heading = $derived(data.listing.q ? strings.shop.resultsFor(data.listing.q) : data.title);
</script>

<svelte:head>
	<title>{data.title} · {strings.brand}</title>
</svelte:head>

<h1 class="title">{heading}</h1>
{#if data.subcategories.length}
	<nav class="chips" aria-label={strings.shop.subcategories}>
		{#each data.subcategories as child (child.slug)}
			<a class="chip" href={resolve('/(shop)/shop/[category]', { category: child.slug })}
				>{child.name}</a
			>
		{/each}
	</nav>
{/if}
<ProductListing listing={data.listing} />

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply mb-3 text-3xl font-extrabold;
	}
	.chips {
		@apply mb-4 flex flex-wrap gap-2;
	}
	.chip {
		@apply tag min-h-11 px-4 text-sm;
	}
</style>
