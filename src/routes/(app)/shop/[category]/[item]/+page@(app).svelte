<script lang="ts">
	import ProductView from '$components/shop/product-view.svelte';
	import BundleView from '$components/shop/bundle-view.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

{#if data.kind === 'product'}
	<ProductView product={data.product} />
{:else}
	<BundleView bundle={data.bundle} />
{/if}
