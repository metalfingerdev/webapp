<script lang="ts">
	import { page } from '$app/state';
	import { Filters } from '$components/shop/index.js';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	let { children } = $props();

	// The filter rail is a resizable pane: left rail on desktop (horizontal group),
	// dropping to the bottom on mobile (vertical group). We swap the pane *order*
	// per direction so filters land on the correct edge in both layouts.
	let direction = $state<'horizontal' | 'vertical'>('horizontal');
	$effect(() => {
		const mq = window.matchMedia('(min-width: 768px)');
		const apply = () => (direction = mq.matches ? 'horizontal' : 'vertical');
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	// Imperative handle to the filter pane so the toggle button can collapse/expand it.
	let filterPane = $state<ReturnType<typeof Pane> | null>(null);
	let collapsed = $state(false);
	const toggleFilters = () => (collapsed ? filterPane?.expand() : filterPane?.collapse());

	// Let the resize handle double as a collapse toggle: a plain click toggles the
	// pane, but a drag (pointer travels past a small threshold) is left to resize.
	let downAt = { x: 0, y: 0 };
	const onResizerDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
	const onResizerClick = (e: MouseEvent) => {
		if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 4) toggleFilters();
	};
	// Minimalistic nav definition
	const navItems = [
		{ label: 'All', path: '/shop' },
		{ label: 'Books', path: '/shop/book' },
		{ label: 'Clothes', path: '/shop/clothes' },
		{ label: 'Stationary', path: '/shop/stationary' }
	];

	// Turn a URL slug into a readable label ("ganga-hindi-2" -> "Ganga Hindi 2").
	const deslug = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

	type Crumb = { label: string; href: string };

	// Breadcrumbs derived from the path: /shop -> /shop/[category] -> /shop/[category]/[slug].
	// Category labels reuse navItems; the product leaf uses the real product name
	// from page.data (falling back to a de-slugged label before it loads).
	const crumbs = $derived.by<Crumb[]>(() => {
		const data = page.data as { product?: { data?: { name?: string } } };
		const parts = page.url.pathname.split('/').filter(Boolean); // ['shop', category?, slug?]
		// No "Home" crumb on purpose — keeps shoppers from accidentally leaving the
		// store. The trail starts at "Shop".
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

		// Search results share the /shop pathname (?q=…) — surface as a trailing crumb.
		const q = page.url.searchParams.get('q')?.trim();
		if (q) items.push({ label: `Search “${q}”`, href: `/shop?q=${encodeURIComponent(q)}` });

		return items;
	});
</script>

<div class="wrapper">
	<header>
		{@render navigation()}
	</header>

	<main>
		<PaneGroup {direction} class="group">
			{@render contentPane()}

			<PaneResizer class="resizer" onpointerdown={onResizerDown} onclick={onResizerClick} />

			{@render filtersPane()}
		</PaneGroup>
	</main>
</div>

{#snippet navigation()}
	<nav class="breadcrumbs" aria-label="Breadcrumb">
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

	<button type="button" class="toggle" onclick={toggleFilters} aria-pressed={!collapsed}>
		{collapsed ? 'Show filters' : 'Hide filters'}
	</button>
{/snippet}

{#snippet filtersPane()}
	<Pane
		bind:this={filterPane}
		defaultSize={22}
		minSize={15}
		maxSize={100}
		collapsible
		collapsedSize={0}
		onCollapse={() => (collapsed = true)}
		onExpand={() => (collapsed = false)}
	>
		<Filters />
	</Pane>
{/snippet}

{#snippet contentPane()}
	<Pane defaultSize={78}>
		{@render children()}
	</Pane>
{/snippet}

<style lang="postcss">
	@reference "src/app.css";

	.wrapper {
		@apply flex h-dvh flex-col overflow-hidden;

		header {
			@apply mt-16 flex px-8 pb-4;

			.breadcrumbs {
				@apply flex flex-wrap items-center gap-2 text-sm text-neutral-500;

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

			button {
				@apply ml-auto;
			}

			.toggle {
				@apply rounded-md px-2 py-0.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100;
			}
		}

		main {
			@apply min-h-0 flex-1;

			:global(.resizer) {
				@apply flex shrink-0 items-center justify-center bg-neutral-100 transition-colors hover:bg-neutral-200;
			}
			:global([data-direction='horizontal'] .resizer) {
				@apply w-1.5 cursor-col-resize;
			}
			:global([data-direction='vertical'] .resizer) {
				@apply h-1.5 cursor-row-resize;
			}
		}
	}
</style>
