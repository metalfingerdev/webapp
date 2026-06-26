<script lang="ts">
	import { page } from '$app/state';
	import { useCart } from '$lib/cart/index.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const cart = useCart();
	const product = $derived(data.product.data);

	const inr = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

	// Product structured data for rich search results (price + availability).
	const jsonLd = $derived(
		product
			? {
					'@context': 'https://schema.org',
					'@type': 'Product',
					name: product.name,
					category: product.category,
					sku: product.barcode ?? undefined,
					offers: {
						'@type': 'Offer',
						priceCurrency: 'INR',
						price: (product.salePrice / 100).toFixed(2),
						availability:
							product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
					}
				}
			: null
	);
</script>

<svelte:head>
	{#if product}
		<title>{product.name} — Aggarwal Book &amp; Stationery Mart</title>
		<meta
			name="description"
			content={`Buy ${product.name} for ${inr(product.salePrice)} at Aggarwal Book & Stationery Mart, Faridabad.`}
		/>
		<link rel="canonical" href={`${page.url.origin}/shop/${product.category}/${product.slug}`} />
		<!-- Closing tag is split (`</${'script'}>`) so the literal "</script>" never
		     appears in source — that substring terminates Svelte/ESLint parsing, and
		     Prettier strips the usual `<\/script>` escape back to `</script>`. -->
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</${'script'}>`}
	{/if}
</svelte:head>

{#if data.product.isLoading}
	<p>Loading product details...</p>
{:else if !product}
	<p>Product not found.</p>
{:else}
	<div class="product-detail">
		<h1>{product.name}</h1>
		<p class="price">{inr(product.salePrice)}</p>
		<p>Category: {product.category}</p>
		<p>In Stock: {product.stock}</p>

		<button
			class="add-to-cart"
			disabled={product.stock <= 0}
			onclick={() =>
				cart.addItem({
					productId: product._id,
					name: product.name,
					stock: product.stock,
					price: product.salePrice,
					category: product.category
				})}
		>
			{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
		</button>
	</div>
{/if}

<style lang="postcss">
	@reference "src/app.css";
</style>
