<script lang="ts">
	import PageHead from '#lib/store/PageHead.svelte';
	import SeoHead from '#lib/store/SeoHead.svelte';
	import ProductListing from '#lib/store/ProductListing.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const heading = $derived(
		data.listing.q ? strings.shop.resultsFor(data.listing.q) : strings.shop.all
	);
</script>

<SeoHead title={heading} description={strings.seo.shop} />

<PageHead title={heading} />
<ProductListing listing={data.listing} />
