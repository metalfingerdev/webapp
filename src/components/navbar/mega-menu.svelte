<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';

	// Schools panel (index 0): one link per bundle, grouped by school.
	const catalog = useQuery(api.bundle.listBundleCatalog, {});
	const bundleLinks = $derived(
		(catalog.data ?? []).flatMap((s) =>
			s.grades.map((g) => ({
				title: `${s.schoolName} · ${g.grade}`,
				href: `/shop/${s.schoolSlug}/${g.gradeSlug}`,
				description: 'Grade-wise book & uniform set.'
			}))
		)
	);

	const books: { title: string; href: string; description: string }[] = [
		{
			title: 'Alert Dialog',
			href: '/shop/books/alert-dialog',
			description:
				'A modal dialog that interrupts the user with important content and expects a response.'
		},
		{
			title: 'Link Preview',
			href: '/shop/books/link-preview',
			description: 'For sighted users to preview content available behind a link.'
		},
		{
			title: 'Progress',
			href: '/shop/books/progress',
			description:
				'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.'
		},
		{
			title: 'Scroll Area',
			href: '/shop/books/scroll-area',
			description: 'Visually or semantically separates content.'
		},
		{
			title: 'Tabs',
			href: '/shop/books/tabs',
			description:
				'A set of layered sections of content—known as tab panels—that are displayed one at a time.'
		},
		{
			title: 'Tooltip',
			href: '/shop/books/tooltip',
			description:
				'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.'
		}
	];

	const unifroms: { title: string; href: string; description: string }[] = [
		{
			title: 'Alert Dialog',
			href: '/shop/books/alert-dialog',
			description:
				'A modal dialog that interrupts the user with important content and expects a response.'
		},
		{
			title: 'Link Preview',
			href: '/shop/books/link-preview',
			description: 'For sighted users to preview content available behind a link.'
		},
		{
			title: 'Progress',
			href: '/shop/books/progress',
			description:
				'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.'
		},
		{
			title: 'Scroll Area',
			href: '/shop/books/scroll-area',
			description: 'Visually or semantically separates content.'
		},
		{
			title: 'Tabs',
			href: '/shop/books/tabs',
			description:
				'A set of layered sections of content—known as tab panels—that are displayed one at a time.'
		},
		{
			title: 'Tooltip',
			href: '/shop/books/tooltip',
			description:
				'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.'
		}
	];

	const stationary: { title: string; href: string; description: string }[] = [
		{
			title: 'Alert Dialog',
			href: '/shop/books/alert-dialog',
			description:
				'A modal dialog that interrupts the user with important content and expects a response.'
		},
		{
			title: 'Link Preview',
			href: '/shop/books/link-preview',
			description: 'For sighted users to preview content available behind a link.'
		},
		{
			title: 'Progress',
			href: '/shop/books/progress',
			description:
				'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.'
		},
		{
			title: 'Scroll Area',
			href: '/shop/books/scroll-area',
			description: 'Visually or semantically separates content.'
		},
		{
			title: 'Tabs',
			href: '/shop/books/tabs',
			description:
				'A set of layered sections of content—known as tab panels—that are displayed one at a time.'
		},
		{
			title: 'Tooltip',
			href: '/shop/books/tooltip',
			description:
				'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.'
		}
	];

	const panels = [
		{ label: 'Books', items: books },
		{ label: 'Uniforms', items: unifroms },
		{ label: 'Stationary', items: stationary }
	];

	type ListItemProps = {
		className?: string;
		title: string;
		href: string;
		content: string;
	};

	const nav = useNavbar();
	const SHIFT = 64;
	const shift = (i: number) =>
		nav.activeIndex === null || nav.activeIndex === i ? 0 : i < nav.activeIndex ? -SHIFT : SHIFT;
</script>

{#snippet ListItem({ title, content, href }: ListItemProps)}
	<li>
		<a {href} class="item">
			<div class="item-title">{title}</div>
			<p class="item-desc">{content}</p>
		</a>
	</li>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="viewport-container"
	class:is-open={nav.isMenuOpen}
	onmouseenter={nav.cancelClose}
	onmouseleave={nav.scheduleClose}
>
	<div
		class="indicator"
		class:pending={!nav.isPositioned}
		class:snap={nav.justOpened}
		style="transform: translateX({nav.indicatorX}px) rotate(45deg);"
	></div>

	<div
		class="viewport"
		class:pending={!nav.isPositioned}
		class:snap={nav.justOpened}
		style="width: {nav.viewportWidth}px; height: {nav.viewportHeight}px; transform: translateX({nav.viewportX}px);"
	>
		<!-- Panel 0: Schools — its own viewport with a hero + bundle links. -->
		<div
			class="content-panel"
			class:active={nav.activeIndex === 0}
			bind:this={nav.panelRefs[0]}
			style="transform: translateX({shift(0)}px);"
		>
			<ul class="panel-grid">
				<li class="hero">
					<a href="/schools" class="hero-card">
						<div class="hero-title">Shop by school</div>
						<p class="hero-desc">Grade-wise book &amp; uniform sets for your school.</p>
					</a>
				</li>

				{#if bundleLinks.length === 0}
					{@render ListItem({
						title: 'No bundles yet',
						href: '/schools',
						content: 'School bundles will appear here once added.'
					})}
				{:else}
					{#each bundleLinks as link (link.href)}
						{@render ListItem({ title: link.title, href: link.href, content: link.description })}
					{/each}
				{/if}
			</ul>
		</div>

		<!-- Panels 1+: one per category trigger (Books / Uniforms / Stationary). -->
		{#each panels as panel, i}
			<div
				class="content-panel"
				class:active={nav.activeIndex === i + 1}
				bind:this={nav.panelRefs[i + 1]}
				style="transform: translateX({shift(i + 1)}px);"
			>
				<ul class="panel-grid">
					{#each panel.items as item}
						{@render ListItem({ title: item.title, href: item.href, content: item.description })}
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.viewport-container {
		/* Shared morph easing — fast-out, long settle (easeOutExpo). */
		--morph: 750ms cubic-bezier(0.16, 1, 0.3, 1);

		@apply pointer-events-none absolute top-full left-0 z-10 mt-2 opacity-0 transition-[opacity,transform] duration-300 ease-in-out perspective-distant;
		transform: translateY(-10px) scale(0.95);

		&.is-open {
			@apply pointer-events-auto opacity-100;
			transform: translateY(0) scale(1);
		}

		.indicator {
			@apply absolute -top-1 z-11 h-2 w-2 border-t border-l bg-white;
			transition:
				opacity 200ms ease,
				transform var(--morph);
		}

		.viewport {
			@apply absolute origin-top overflow-hidden rounded-4xl border shadow-lg;
			transition:
				width var(--morph),
				height var(--morph),
				transform var(--morph);
		}

		/* Hidden until the panel has been measured — stops the un-sized 0×0 box
		   (a tiny dark border square) flashing on the first open. */
		.indicator.pending,
		.viewport.pending {
			@apply invisible;
		}

		/* Snap into place on open-from-closed: kill the transition for that frame
		   so it doesn't slide/grow from the previous (or zero) position. */
		.indicator.snap,
		.viewport.snap {
			transition: none;
		}

		.content-panel {
			@apply pointer-events-none absolute top-0 left-0 opacity-0;
			transition:
				opacity 450ms ease,
				transform var(--morph);

			&.active {
				@apply pointer-events-auto opacity-100;
			}
		}

		.panel-grid {
			@apply m-0 grid list-none gap-x-2.5 p-3 sm:w-150 sm:grid-flow-col sm:grid-rows-3 sm:p-5.5;
		}

		.hero {
			@apply row-span-3 mb-2 sm:mb-0;
		}

		.hero-card {
			@apply flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b from-neutral-50 to-neutral-100 p-6 no-underline outline-hidden select-none focus:shadow-md;
		}

		.hero-title {
			@apply mt-4 mb-2 text-lg font-medium;
		}

		.hero-desc {
			@apply text-sm leading-tight text-neutral-500;
		}

		.item {
			@apply block space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-neutral-100;
		}

		.item-title {
			@apply text-sm leading-none font-medium;
		}

		.item-desc {
			@apply line-clamp-2 text-sm leading-snug text-neutral-500;
		}
	}
</style>
