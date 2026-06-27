<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useSidebar } from '$lib/sidebar/index.js';

	type CategoryKey = 'books' | 'uniform' | 'stationary' | 'school';
	type ShopCategory = 'book' | 'clothes' | 'stationary';

	let { view }: { view: CategoryKey } = $props();

	const sidebar = useSidebar();

	const formatINR = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

	// One config per drill-down view. `category` is the products-table category to
	// query (null for the School overview, which only links out to the others).
	const CONFIG: Record<
		CategoryKey,
		{
			title: string;
			category: ShopCategory | null;
			card: { heading: string; cta: string; href: string };
			explore: { label: string; href: string }[];
		}
	> = {
		books: {
			title: 'Books',
			category: 'book',
			card: { heading: 'Find your NCERT set', cta: 'Shop books', href: '/shop/book' },
			explore: [
				{ label: 'All books', href: '/shop/book' },
				{ label: 'Shop by school', href: '/shop' }
			]
		},
		uniform: {
			title: 'Uniforms',
			category: 'clothes',
			card: { heading: 'Kit out for the new term', cta: 'Shop uniforms', href: '/shop/clothes' },
			explore: [
				{ label: 'All uniforms', href: '/shop/clothes' },
				{ label: 'Shop by school', href: '/shop' }
			]
		},
		stationary: {
			title: 'Stationary',
			category: 'stationary',
			card: { heading: 'Stock up on essentials', cta: 'Shop stationary', href: '/shop/stationary' },
			explore: [{ label: 'All stationary', href: '/shop/stationary' }]
		},
		school: {
			title: 'School',
			category: null,
			card: { heading: 'Everything for the year', cta: 'Shop all', href: '/shop' },
			explore: [
				{ label: 'Books', href: '/shop/book' },
				{ label: 'Uniforms', href: '/shop/clothes' },
				{ label: 'Stationary', href: '/shop/stationary' }
			]
		}
	};

	const config = $derived(CONFIG[view]);

	// Live products for the section list — skipped on the School overview.
	const products = useQuery(api.products.getProducts, () =>
		config.category
			? { category: config.category, paginationOpts: { numItems: 6, cursor: null } }
			: 'skip'
	);

	// Only list products with a slug — the detail route is /shop/[category]/[slug].
	const items = $derived((products.data?.page ?? []).filter((p) => p.slug));

	const close = () => sidebar.close();
</script>

<section class="cat">
	<h2 class="title">{config.title}</h2>

	<a class="hero" href={config.card.href} onclick={close}>
		<span class="hero-heading">{config.card.heading}</span>
		<span class="hero-cta">{config.card.cta}</span>
		<span class="hero-go"><ArrowRight size={18} /></span>
	</a>

	<div class="group">
		<span class="label">Explore</span>
		{#each config.explore as link (link.href + link.label)}
			<a class="row" href={link.href} onclick={close}>
				{link.label}
				<ArrowRight size={18} />
			</a>
		{/each}
	</div>

	{#if config.category}
		<div class="group">
			<span class="label">Products</span>
			{#if products.isLoading}
				<p class="status">Loading…</p>
			{:else if items.length === 0}
				<p class="status">Nothing here yet.</p>
			{:else}
				{#each items as p (p._id)}
					<a class="product" href="/shop/{p.category}/{p.slug}" onclick={close}>
						<span class="name">{p.name}</span>
						<span class="price">{formatINR(p.salePrice)}</span>
					</a>
				{/each}
			{/if}
		</div>
	{/if}
</section>

<style lang="postcss">
	@reference 'src/app.css';

	.cat {
		@apply m-4 grid gap-6;
	}

	.title {
		@apply text-2xl font-semibold tracking-[-0.015em];
	}

	/* Featured card — stands in for hims.com's hero image with a gradient. */
	.hero {
		@apply relative grid gap-1 squircle-4xl bg-gradient-to-br from-neutral-800 to-neutral-600 p-4 pb-14 text-white;

		.hero-heading {
			@apply max-w-[14rem] text-lg leading-tight font-semibold;
		}

		.hero-cta {
			@apply text-sm text-white/80;
		}

		/* Circular arrow pinned to the bottom-left, hims-style. */
		.hero-go {
			@apply absolute bottom-4 left-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-900;
		}
	}

	.group {
		@apply grid gap-1;
	}

	.label {
		@apply px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase;
	}

	.row {
		@apply flex items-center justify-between squircle-4xl px-2 py-3 text-lg text-neutral-900 transition-colors;

		&:hover {
			@apply bg-neutral-100;
		}
	}

	.product {
		@apply flex items-center justify-between gap-3 squircle-4xl px-2 py-2.5 text-sm transition-colors;

		.name {
			@apply truncate text-neutral-900;
		}

		.price {
			@apply shrink-0 text-neutral-500 tabular-nums;
		}

		&:hover {
			@apply bg-neutral-100;
		}
	}

	.status {
		@apply px-2 py-2 text-sm text-neutral-500;
	}
</style>
