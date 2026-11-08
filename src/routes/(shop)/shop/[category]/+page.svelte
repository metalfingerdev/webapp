<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHead from '#lib/store/PageHead.svelte';
	import ProductListing from '#lib/store/ProductListing.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const heading = $derived(data.listing.q ? strings.shop.resultsFor(data.listing.q) : data.title);
</script>

<svelte:head>
	<title>{data.title} · {strings.brand}</title>
</svelte:head>

<PageHead title={heading} />
{#if data.subcategories.length}
	<nav class="chips" aria-label={strings.shop.subcategories}>
		{#each data.subcategories as child (child.slug)}
			<a href={resolve('/(shop)/shop/[category]', { category: child.slug })}>{child.name}</a>
		{/each}
	</nav>
{/if}
<ProductListing listing={data.listing} />

<style lang="postcss">
	@reference 'src/app.css';

	nav.chips {
		@apply -mt-4 mb-6 flex flex-wrap gap-2;

		a {
			@apply inline-flex min-h-11 press items-center rounded-full raised px-4 text-sm font-bold;
		}
	}
</style>
