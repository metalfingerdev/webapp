<script lang="ts">
	import { page } from '$app/state';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useCart } from '$lib/cart/index.js';
	import type { Id } from '$convex/_generated/dataModel.js';

	const cart = useCart();

	// Cast params to satisfy TypeScript if syncing lags
	const params = $derived(page.params as Record<string, string>);

	// Wire up live query tracking the dynamic ID parameter
	let productQuery = $derived(
		useQuery(api.products.getProductById, { id: params.id as Id<'products'> })
	);
</script>

{#if productQuery.isLoading}
	<p>Loading product details...</p>
{:else if !productQuery.data}
	<p>Product not found.</p>
{:else}
	{@const product = productQuery.data}
	<div class="product-detail">
		<h1>{product.name}</h1>
		<p class="price">${(product.salePrice / 100).toFixed(2)}</p>
		<p>Category: {product.category}</p>
		<p>In Stock: {product.stock}</p>

		<button
			class="add-to-cart"
			disabled={product.stock <= 0}
			onclick={() =>
				// FIX: Aligned object properties with Omit<CartItem, 'quantity'>
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
