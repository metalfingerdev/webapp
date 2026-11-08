<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Media from '#lib/ui/Media.svelte';
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
		<span class="thumb">
			<Media
				src={product.imageUrl}
				ratio="3 / 4"
				slot="product-thumb"
				icon={BookOpenIcon}
				iconSize={18}
				width={48}
				height={64}
			/>
		</span>
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

	a.row {
		@apply flex min-h-20 press items-center gap-4 rounded-3xl raised p-3 pr-4;

		span.thumb {
			@apply w-12 shrink-0;
			--media-radius: 0.625rem;
		}
		span.main {
			@apply flex min-w-0 flex-1 flex-col;

			span.title {
				@apply truncate font-bold;
			}
			span.meta {
				@apply truncate text-xs text-text-muted;
			}
		}
		span.side {
			@apply flex shrink-0 flex-col items-end gap-1 text-right;

			span.price {
				@apply font-display font-bold;
			}
			span.pills {
				@apply flex items-center gap-1;
			}
			span.count {
				@apply text-xs text-text-muted;
			}
		}
	}
</style>
