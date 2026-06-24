<script lang="ts">
	import { page } from '$app/state';
	import { usePaginatedQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useCart } from '$lib/cart/index.js';

	const cart = useCart();
	const PAGE_SIZE = 50;

	const params = $derived(page.params as Record<string, string>);
	let category = $derived(params.category as 'book' | 'clothes' | 'stationary');

	const productsQuery = usePaginatedQuery(
		api.products.getProductsThatAre,
		() => ({ category: category }),
		{ initialNumItems: PAGE_SIZE }
	);
</script>

<div class="shop">
	<header class="header">
		<h1>{category.toUpperCase()}</h1>
	</header>

	{#if productsQuery.isLoading && productsQuery.results.length === 0}
		<p>Loading...</p>
	{:else}
		<div class="grid">
			{#each productsQuery.results as product (product._id)}
				<div class="card">
					<a class="product-link" href="/shop/{product.category}/{product._id}">
						<h3>{product.name}</h3>
						<p>
							{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
								product.salePrice / 100
							)}
						</p>
					</a>

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
			{/each}
		</div>

		{#if productsQuery.status === 'CanLoadMore'}
			<button class="load-more" onclick={() => productsQuery.loadMore(PAGE_SIZE)}>
				Load More
			</button>
		{/if}
	{/if}
</div>

<style lang="postcss">
	@reference "src/app.css";
</style>
