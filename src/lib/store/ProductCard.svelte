<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import type { ProductCard } from '#convex/model/store/publicProjection.js';
	import Media from '#lib/ui/Media.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import { classRange, discountPercent, formatPrice } from './format.js';
	import { strings } from './strings.js';

	let { product }: { product: ProductCard } = $props();

	const percent = $derived(discountPercent(product.price, product.mrp));
	const classes = $derived(classRange(product.classFrom, product.classTo));
</script>

<a
	class="card"
	href={resolve('/(shop)/shop/[category]/[slug]', {
		category: product.categorySlug,
		slug: product.slug
	})}
>
	<div class="picture">
		<Media
			src={product.imageUrl}
			ratio="3 / 4"
			slot="product-cover"
			icon={BookOpenIcon}
			width={300}
			height={400}
		/>
		{#if percent > 0}
			<span class="badge"><Pill tone="ok">{strings.product.off(percent)}</Pill></span>
		{/if}
	</div>
	<h3 class="title">{product.title}</h3>
	{#if product.author}<p class="meta">{product.author}</p>{:else if classes}<p class="meta">
			{classes}
		</p>{/if}
	<p class="price">
		{#if product.hasSizes}<span class="from">{strings.product.from}</span>{/if}
		<strong>{formatPrice(product.price)}</strong>
		{#if percent > 0}<s class="mrp">{formatPrice(product.mrp)}</s>{/if}
	</p>
	{#if product.availability === 'out'}
		<Pill tone="bad">{strings.product.out}</Pill>
	{:else if product.availability === 'few_left'}
		<Pill tone="warn">{strings.product.fewLeft}</Pill>
	{/if}
</a>

<style lang="postcss">
	@reference 'src/app.css';

	a.card {
		@apply flex h-full press flex-col gap-2 rounded-3xl raised p-2.5;

		div.picture {
			@apply relative;
		}
		span.badge {
			@apply absolute top-2 left-2;
		}
		h3.title {
			@apply mt-1 line-clamp-2 px-1 text-sm leading-snug font-bold;
		}
		p.meta {
			@apply line-clamp-1 px-1 text-xs text-text-muted;
		}
		p.price {
			@apply mt-auto flex flex-wrap items-baseline gap-x-1.5 px-1 tabular-nums;

			strong {
				@apply font-display text-lg;
			}
		}
		:is(span.from, s.mrp) {
			@apply text-xs text-text-muted;
		}
	}
</style>
