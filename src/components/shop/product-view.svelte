<script lang="ts">
	import { page } from '$app/state';
	import { useCart } from '$lib/cart/index.js';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '$convex/_generated/api.js';

	type Result = {
		data: FunctionReturnType<typeof api.products.getProductBySlug> | undefined;
		isLoading: boolean;
	};
	let { product: result }: { product: Result } = $props();

	const cart = useCart();
	const product = $derived(result.data);

	const inr = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

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
		<!-- Closing tag is split so the literal "</script>" never appears in source. -->
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</${'script'}>`}
	{/if}
</svelte:head>

{#if result.isLoading}
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
	@reference 'src/app.css';
</style>
