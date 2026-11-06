<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Pill from '#lib/ui/Pill.svelte';
	import { classRange, discountPercent, formatPrice } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const product = $derived(data.product);
	const percent = $derived(discountPercent(product.price, product.mrp));
	const classes = $derived(classRange(product.classFrom, product.classTo));
	const details = $derived(
		[
			[strings.product.publisher, product.publisher],
			[strings.product.isbn, product.isbn],
			[strings.product.edition, product.edition],
			[strings.product.subject, product.subject],
			[strings.product.class, classes]
		].filter((row): row is [string, string] => Boolean(row[1]))
	);
	const availabilityText = {
		in_stock: strings.product.inStock,
		few_left: strings.product.fewLeft,
		out: strings.product.out
	} as const;
	const tone = { in_stock: 'ok', few_left: 'warn', out: 'bad' } as const;
</script>

<svelte:head>
	<title>{product.title} · {strings.brand}</title>
	<meta
		name="description"
		content={[product.title, product.author && `${strings.product.by} ${product.author}`, classes]
			.filter(Boolean)
			.join(', ')}
	/>
</svelte:head>

<nav class="crumbs" aria-label={strings.product.breadcrumb}>
	<a href={resolve('/(shop)/shop/[category]', { category: product.categorySlug })}
		>{product.categoryName}</a
	>
</nav>

<article class="product">
	<div class="picture">
		{#if product.imageUrl}
			<img src={product.imageUrl} alt={product.title} width="600" height="800" decoding="async" />
		{:else}
			<BookOpenIcon class="size-20 text-text-muted" aria-hidden="true" />
		{/if}
	</div>
	<div class="info">
		<h1 class="title">{product.title}</h1>
		{#if product.author}<p class="muted">{strings.product.by} {product.author}</p>{/if}
		<p class="price">
			{#if product.hasSizes}<span class="muted">{strings.product.from}</span>{/if}
			<strong class="amount">{formatPrice(product.price)}</strong>
			{#if percent > 0}
				<s class="muted">{formatPrice(product.mrp)}</s>
				<Pill tone="ok">{strings.product.off(percent)}</Pill>
			{/if}
		</p>
		<p class="muted">{strings.product.inclusiveOfTax}</p>
		<p><Pill tone={tone[product.availability]}>{availabilityText[product.availability]}</Pill></p>

		{#if product.variants.length > 1}
			<h2 class="section">{strings.product.options}</h2>
			<ul class="variants">
				{#each product.variants as variant (variant.id)}
					<li>
						<span class="font-bold">{variant.label}</span>
						<span>{formatPrice(variant.price)}</span>
						{#if variant.availability === 'out'}<Pill tone="bad">{strings.product.out}</Pill>{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if details.length}
			<h2 class="section">{strings.product.details}</h2>
			<dl class="details">
				{#each details as [label, value] (label)}
					<div>
						<dt class="muted">{label}</dt>
						<dd>{value}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</div>
</article>

<style lang="postcss">
	@reference 'src/app.css';

	.crumbs a {
		@apply inline-flex min-h-11 items-center text-sm font-bold text-primary;
	}
	.product {
		@apply grid gap-6 md:grid-cols-2;
	}
	.picture {
		@apply grid aspect-[3/4] max-h-[32rem] place-items-center overflow-hidden rounded-xl bg-midground;
	}
	.picture img {
		@apply size-full object-cover;
	}
	.info {
		@apply flex flex-col gap-3;
	}
	.title {
		@apply text-3xl leading-tight font-extrabold;
	}
	.muted {
		@apply text-sm text-text-muted;
	}
	.price {
		@apply flex flex-wrap items-baseline gap-2 tabular-nums;
	}
	.amount {
		@apply text-3xl;
	}
	.section {
		@apply mt-2 text-lg font-extrabold;
	}
	.variants li {
		@apply flex min-h-11 items-center justify-between gap-3 border-b-2 border-border-muted tabular-nums;
	}
	.details {
		@apply flex flex-col gap-1;
	}
	.details div {
		@apply flex gap-3;
	}
	.details dt {
		@apply w-28 shrink-0;
	}
</style>
