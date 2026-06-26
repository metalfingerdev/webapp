<script lang="ts">
	import { useCart } from '$lib/cart/index.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const cart = useCart();
	const PAGE_SIZE = 50;

	const inr = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
</script>

<svelte:head>
	<title
		>{data.category[0].toUpperCase() + data.category.slice(1)} — Aggarwal Book &amp; Stationery Mart</title
	>
	<meta
		name="description"
		content="Shop {data.category} at Aggarwal Book & Stationery Mart, Faridabad."
	/>
</svelte:head>

<div class="shop">
	<header class="header">
		<h1>{data.category.toUpperCase()}</h1>
	</header>

	{#if data.products.isLoading && data.products.results.length === 0}
		<p>Loading...</p>
	{:else}
		<div class="grid">
			{#each data.products.results as product (product._id)}
				<div class="card">
					<a class="product-link" href="/shop/{product.category}/{product.slug}">
						<h3>{product.name}</h3>
						<p>{inr(product.salePrice)}</p>
					</a>

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
			{/each}
		</div>

		{#if data.products.status === 'CanLoadMore'}
			<button class="load-more" onclick={() => data.products.loadMore(PAGE_SIZE)}>
				Load More
			</button>
		{/if}
	{/if}
</div>

<style lang="postcss">
	@reference "src/app.css";
</style>
