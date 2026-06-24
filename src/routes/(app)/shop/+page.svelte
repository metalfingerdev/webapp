<script lang="ts">
	import { usePaginatedQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	// FIX: Point to the clean entry point folder path or .svelte.ts explicitly
	import { useCart } from '$lib/cart/index.js';

	const cart = useCart();
	const PAGE_SIZE = 50;

	const productsQuery = usePaginatedQuery(api.products.getProducts, () => ({}), {
		initialNumItems: PAGE_SIZE
	});
</script>

<div class="shop">
	<header>
		<h1>ALL PRODUCTS</h1>
	</header>

	{#if productsQuery.isLoading && productsQuery.results.length === 0}
		<span class="status">Loading catalog...</span>
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
							// FIX: Added 'stock' property to seamlessly align with your strict Omit<CartItem, 'quantity'> interface
							cart.addItem({
								productId: product._id,
								name: product.name,
								price: product.salePrice,
								category: product.category,
								stock: product.stock
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
