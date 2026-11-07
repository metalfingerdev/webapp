<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import type { ProductCard } from '#convex/model/store/publicProjection.js';
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
		{#if product.imageUrl}
			<img src={product.imageUrl} alt="" width="300" height="400" loading="lazy" decoding="async" />
		{:else}
			<BookOpenIcon class="size-10 text-text-muted" aria-hidden="true" />
		{/if}
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

	.card {
		--fill: var(--color-foreground);
		@apply flex edge-press flex-col gap-1.5 rounded-xl bg-foreground p-2.5 edge;
	}

	.picture {
		@apply relative grid aspect-[3/4] place-items-center overflow-hidden rounded-lg bg-midground;

		img {
			@apply size-full object-cover;
		}
	}

	.badge {
		@apply absolute top-1.5 left-1.5;
	}

	.title {
		@apply line-clamp-2 text-sm leading-snug font-bold;
	}

	.meta {
		@apply line-clamp-1 text-xs text-text-muted;
	}

	.price {
		@apply flex flex-wrap items-baseline gap-x-1.5 tabular-nums;
	}

	.from,
	.mrp {
		@apply text-xs text-text-muted;
	}
</style>
