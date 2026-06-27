<script lang="ts">
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// A navbar "view": on /shop routes the pill grows to show the trail below the
	// nav links, the same way the search field expands it. Self-contained — it
	// derives everything from the route, so no layout has to feed it.
	const navItems = [
		{ label: 'All', path: '/shop' },
		{ label: 'Books', path: '/shop/book' },
		{ label: 'Clothes', path: '/shop/clothes' },
		{ label: 'Stationary', path: '/shop/stationary' }
	];

	// Turn a URL slug into a readable label ("ganga-hindi-2" -> "Ganga Hindi 2").
	const deslug = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

	type Crumb = { label: string; href: string };

	const onShop = $derived(
		page.url.pathname === '/shop' || page.url.pathname.startsWith('/shop/')
	);

	// /shop -> /shop/[category] -> /shop/[category]/[slug]. Category labels reuse
	// navItems; the product leaf uses the real name from page.data (falling back
	// to a de-slugged label before it loads).
	const crumbs = $derived.by<Crumb[]>(() => {
		const data = page.data as { product?: { data?: { name?: string } } };
		const parts = page.url.pathname.split('/').filter(Boolean); // ['shop', category?, slug?]
		const items: Crumb[] = [];

		let acc = '';
		parts.forEach((seg, i) => {
			acc += `/${seg}`;
			let label: string;
			if (i === 0) label = 'Shop';
			else if (i === 1) label = navItems.find((n) => n.path === acc)?.label ?? deslug(seg);
			else label = data.product?.data?.name ?? deslug(seg);
			items.push({ label, href: acc });
		});

		const q = page.url.searchParams.get('q')?.trim();
		if (q) items.push({ label: `Search “${q}”`, href: `/shop?q=${encodeURIComponent(q)}` });

		return items;
	});
</script>

{#if onShop}
	<!-- Mounted only on /shop; `slide` animates the pill's height. w-0 + min-w-full
	     lets it fill the pill without ever widening it (so the nav row never shifts). -->
	<nav
		class="crumbs"
		aria-label="Breadcrumb"
		transition:slide={{ duration: 240, easing: cubicOut }}
	>
		<span class="sep" aria-hidden="true">/</span>
		{#each crumbs as crumb, i (crumb.href)}
			{#if i === crumbs.length - 1}
				<span class="current" aria-current="page">{crumb.label}</span>
			{:else}
				<a href={crumb.href}>{crumb.label}</a>
				<span class="sep" aria-hidden="true">/</span>
			{/if}
		{/each}
	</nav>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.crumbs {
		@apply flex w-0 min-w-full flex-wrap items-center gap-2 px-3 py-2 text-sm text-neutral-500;

		a {
			@apply rounded transition-colors hover:text-neutral-900 hover:underline;
		}

		.sep {
			@apply text-neutral-300 select-none;
		}

		.current {
			@apply font-medium text-neutral-900;
		}
	}
</style>
