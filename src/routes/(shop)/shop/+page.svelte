<script lang="ts">
	import ProductListing from '#lib/store/ProductListing.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const heading = $derived(
		data.listing.q ? strings.shop.resultsFor(data.listing.q) : strings.shop.all
	);
</script>

<svelte:head>
	<title>{heading} · {strings.brand}</title>
</svelte:head>

<h1 class="title">{heading}</h1>
<ProductListing listing={data.listing} />

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply mb-4 text-3xl font-extrabold;
	}
</style>
