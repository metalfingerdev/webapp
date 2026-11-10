<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Button from '#lib/ui/Button.svelte';
	import Media from '#lib/ui/Media.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import { useCart } from '#lib/store/cart.svelte.js';
	import { classRange, discountPercent, formatPrice } from '#lib/store/format.js';
	import SeoHead from '#lib/store/SeoHead.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const product = $derived(data.product);
	const cart = useCart();
	// A product with one size needs no choice; with several, the parent picks first
	let picked = $state('');
	const variantId = $derived(product.variants.length === 1 ? product.variants[0].id : picked);
	const chosen = $derived(product.variants.find((variant) => variant.id === variantId));
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

<SeoHead
	title={product.title}
	description={[product.title, product.author && `${strings.product.by} ${product.author}`, classes]
		.filter(Boolean)
		.join(', ')}
	image={product.imageUrl}
/>

<nav class="crumbs" aria-label={strings.product.breadcrumb}>
	<a href={resolve('/(shop)/shop/[category]', { category: product.categorySlug })}
		>{product.categoryName}</a
	>
</nav>

<article class="product">
	<div class="picture">
		<Media
			src={product.imageUrl}
			alt={product.title}
			ratio="3 / 4"
			slot="product-photo"
			icon={BookOpenIcon}
			iconSize={56}
			eager
			width={600}
			height={800}
		/>
	</div>
	<div class="info">
		<h1 class="title">{product.title}</h1>
		{#if product.author}<p class="muted">{strings.product.by} {product.author}</p>{/if}
		<div class="buy">
			<p class="price">
				{#if product.hasSizes}<span class="muted">{strings.product.from}</span>{/if}
				<strong class="amount">{formatPrice(product.price)}</strong>
				{#if percent > 0}
					<s class="muted">{formatPrice(product.mrp)}</s>
					<Pill tone="ok">{strings.product.off(percent)}</Pill>
				{/if}
			</p>
			<p class="muted">{strings.product.inclusiveOfTax}</p>
			<p class="stock">
				<Pill tone={tone[product.availability]}>{availabilityText[product.availability]}</Pill>
			</p>

			{#if product.variants.length > 1}
				<h2 class="section">{strings.product.options}</h2>
				<ul class="variants">
					{#each product.variants as variant (variant.id)}
						<li>
							<label class="pick">
								<input
									type="radio"
									name="size"
									value={variant.id}
									bind:group={picked}
									disabled={variant.availability === 'out'}
								/>
								<strong>{variant.label}</strong>
								<span>{formatPrice(variant.price)}</span>
								{#if variant.availability === 'out'}<Pill tone="bad">{strings.product.out}</Pill
									>{/if}
							</label>
						</li>
					{/each}
				</ul>
			{/if}

			<Button
				variant="primary"
				large
				disabled={!chosen || chosen.availability === 'out'}
				onclick={() => cart.add([{ variantId: variantId, quantity: 1 }])}
			>
				{strings.cart.adding}
			</Button>
			{#if !chosen}<p class="muted">{strings.cart.chooseSize}</p>{/if}
		</div>

		{#if details.length}
			<h2 class="section">{strings.product.details}</h2>
			<dl class="details">
				{#each details as [label, value] (label)}
					<div>
						<dt>{label}</dt>
						<dd>{value}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</div>
</article>

<style lang="postcss">
	@reference 'src/app.css';

	nav.crumbs a {
		@apply -ml-2 inline-flex min-h-11 items-center rounded-full px-2 type-kicker text-accent;
	}

	article.product {
		@apply grid items-start gap-8 md:grid-cols-[5fr_6fr];

		div.picture {
			@apply rounded-[2rem] raised p-3 md:sticky md:top-24;
			--media-radius: 1.5rem;
		}

		div.info {
			@apply flex flex-col gap-4;

			h1.title {
				@apply type-display text-4xl sm:text-5xl;
			}
			.muted {
				@apply text-sm text-text-muted;
			}
		}

		/* Price, stock, sizes and the button, in one raised panel */
		div.buy {
			@apply flex flex-col gap-3 rounded-[1.75rem] raised p-5;

			p.price {
				@apply flex flex-wrap items-baseline gap-2 tabular-nums;

				strong.amount {
					@apply font-display text-4xl;
				}
			}
			ul.variants {
				@apply flex flex-col gap-2;

				label.pick {
					@apply flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl sunken px-4 tabular-nums;

					input {
						@apply size-5 border-0 text-primary shadow-inset;
					}
					strong {
						@apply flex-1;
					}
				}
			}
		}

		h2.section {
			@apply mt-2 type-title;
		}

		dl.details {
			@apply flex flex-col rounded-[1.75rem] sunken p-5;

			div {
				@apply flex gap-3 border-b border-border-muted py-2 last:border-b-0;
			}
			dt {
				@apply w-28 shrink-0 text-sm text-text-muted;
			}
		}
	}
</style>
