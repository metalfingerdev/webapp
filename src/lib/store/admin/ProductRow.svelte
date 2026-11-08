<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FunctionReturnType } from 'convex/server';
	import type { api } from '#convex/_generated/api.js';
	import { formatPrice } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Pill from '#lib/ui/Pill.svelte';

	type Row = FunctionReturnType<typeof api.store.admin.products.search>[number];
	let { product }: { product: Row } = $props();
	const text = strings.admin.products;

	const onSale = $derived(product.variants.filter((v) => v.isActive));
	const total = $derived(onSale.reduce((sum, v) => sum + v.stock, 0));
	const anyOut = $derived(onSale.some((v) => v.stock === 0));
	const anyLow = $derived(onSale.some((v) => v.stock > 0 && v.stock <= v.lowStockAt));
	const prices = $derived(onSale.map((v) => v.price));
	const priceText = $derived(
		prices.length === 0
			? ''
			: Math.min(...prices) === Math.max(...prices)
				? formatPrice(prices[0])
				: `${formatPrice(Math.min(...prices))} to ${formatPrice(Math.max(...prices))}`
	);
</script>

<li>
	<a class="row" href={resolve('/admin/products/[id]', { id: product._id })}>
		{#if product.imageUrl}
			<img src={product.imageUrl} alt="" width="48" height="64" loading="lazy" />
		{:else}
			<span class="thumb" aria-hidden="true"></span>
		{/if}
		<span class="main">
			<span class="title">{product.title}</span>
			<span class="meta">
				{product.category}
				{#if product.variants.length > 1}· {text.sizes(product.variants.length)}{/if}
				{#if product.variants.length === 1 && product.variants[0].sku}· {product.variants[0]
						.sku}{/if}
			</span>
		</span>
		<span class="side">
			<span class="price">{priceText}</span>
			<span class="pills">
				{#if !product.isActive}<Pill>{text.hidden}</Pill>{/if}
				{#if anyOut}<Pill tone="bad">{text.out}</Pill>{:else if anyLow}<Pill tone="warn"
						>{text.low}</Pill
					>{/if}
				<span class="count">{text.inStock(total)}</span>
			</span>
		</span>
	</a>
</li>

<style lang="postcss">
	@reference 'src/app.css';

	.row {
		@apply flex min-h-16 press items-center gap-3 rounded-xl raised p-2 pr-3;
	}
	img,
	.thumb {
		@apply h-16 w-12 shrink-0 rounded-md bg-midground object-cover;
	}
	.thumb {
		@apply sunken;
	}
	.main {
		@apply flex min-w-0 flex-1 flex-col;
	}
	.title {
		@apply truncate text-sm font-bold;
	}
	.meta {
		@apply truncate text-xs text-text-muted;
	}
	.side {
		@apply flex shrink-0 flex-col items-end gap-1 text-right;
	}
	.price {
		@apply text-sm font-bold;
	}
	.pills {
		@apply flex items-center gap-1;
	}
	.count {
		@apply text-xs text-text-muted;
	}
</style>
