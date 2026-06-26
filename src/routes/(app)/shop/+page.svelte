<script lang="ts">
	import { useCart } from '$lib/cart/index.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const cart = useCart();
	const PAGE_SIZE = 50;

	const inr = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
</script>

{#if data.products.isLoading && data.products.results.length === 0}
	<span class="status">Loading...</span>
{:else if data.q && data.products.results.length === 0}
	<p class="status">No products match “{data.q}”.</p>
{:else}
	<section class="grid">
		{#each data.products.results as product (product._id)}
			<article class="card">
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
							price: product.salePrice,
							category: product.category,
							stock: product.stock
						})}
				>
					{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
				</button>
			</article>
		{/each}
	</section>

	{#if data.products.status === 'CanLoadMore'}
		<article class="card">
			<button class="load-more" onclick={() => data.products.loadMore(PAGE_SIZE)}>
				Load More
			</button>
		</article>
	{/if}
{/if}

<style lang="postcss">
	@reference "src/app.css";

	section {
		@apply grid h-full gap-2 overflow-auto;
		/* Mobile-first: a column that never outgrows the viewport (min(…,100%)
		   avoids overflow on narrow phones) and shorter cards. */
		grid-template-columns: repeat(auto-fill, minmax(min(12rem, 100%), 1fr));
		grid-auto-rows: 16rem;

		article.card {
			@apply flex flex-col items-center justify-center squircle-4xl border bg-neutral-100 shadow;
			&:hover {
				@apply bg-neutral-50 shadow-md;
			}
		}
	}

	/* Roomier cards from tablet up (matches the layout's 768px breakpoint). */
	@media (min-width: 768px) {
		section {
			grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
			grid-auto-rows: 32rem;
		}
	}
</style>
