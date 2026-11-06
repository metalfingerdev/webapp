<script lang="ts">
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';
	import MegaPanel from './mega-panel.svelte';

	const nav = useNavbar();

	type MenuItem = { title: string; href: string; description: string };

	// Per-panel link lists, hardcoded here. Each panel is independent — edit one
	// without touching the others. A panel's index in the template must match its
	// trigger order in nav-row.svelte (0 Schools · 1 Books · 2 Uniforms · 3 Stationary).
	const school: MenuItem[] = [
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
		}
	];

	const booksItems: MenuItem[] = [
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

	const uniformItems: MenuItem[] = [
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
		}
	];

	const stationaryItems: MenuItem[] = [
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="viewport-container"
	class:is-open={nav.isMenuOpen}
	onmouseenter={nav.cancelClose}
	onmouseleave={nav.scheduleClose}
>
	<div
		class="bridge"
		class:pending={!nav.isPositioned}
		style="--width: {nav.viewportWidth}px; transform: translateX({nav.viewportX}px);"
	></div>

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
		style="--width: {nav.viewportWidth}px; --height: {nav.viewportHeight}px; transform: translateX({nav.viewportX}px);"
	>
		<MegaPanel index={0} items={school}>
			<li class="hero">
				<a href="/schools" class="hero-card">
					<div class="hero-title">Shop by school</div>
					<p class="hero-desc">Grade-wise book &amp; uniform sets for your school.</p>
				</a>
			</li>
		</MegaPanel>

		<MegaPanel index={1} items={booksItems}>
			<li class="hero">
				<a href="/schools" class="hero-card">
					<div class="hero-title">Shop by school</div>
					<p class="hero-desc">Grade-wise book &amp; uniform sets for your school.</p>
				</a>
			</li>

			<li class="hero">
				<a href="/schools" class="hero-card">
					<div class="hero-title">Shop by school</div>
					<p class="hero-desc">Grade-wise book &amp; uniform sets for your school.</p>
				</a>
			</li>
		</MegaPanel>

		<MegaPanel index={2} items={uniformItems}
			><li class="hero">
				<a href="/schools" class="hero-card">
					<div class="hero-title">Shop by school</div>
					<p class="hero-desc">Grade-wise book &amp; uniform sets for your school.</p>
				</a>
			</li>
			<li class="hero">
				<a href="/schools" class="hero-card">
					<div class="hero-title">Shop by school</div>
					<p class="hero-desc">Grade-wise book &amp; uniform sets for your school.</p>
				</a>
			</li></MegaPanel
		>

		<MegaPanel index={3} items={stationaryItems} />
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.viewport-container {
		--morph: 360ms cubic-bezier(0.16, 1, 0.3, 1);
		--motion: 180ms cubic-bezier(0.4, 0, 0.2, 1);
		--slide: 120px;

		@apply pointer-events-none absolute top-full left-0 z-10 mt-2 -translate-y-2 opacity-0;
		@apply bg-background transition-[opacity,translate] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)];

		&.is-open {
			@apply pointer-events-auto translate-y-0 opacity-100 transition;
		}

		.bridge {
			/* Sits directly above the panel, covering the `mt-2` gap (plus a hair
			   of overlap into the pill) so the trigger→panel path stays hoverable. */
			@apply absolute -top-3 h-3 w-(--width) origin-top;
			transition: transform var(--morph);
		}

		.indicator {
			@apply absolute -top-1 z-11 h-2 w-2 border-t border-l bg-background;
			transition:
				opacity 200ms ease,
				transform var(--morph);
		}

		.viewport {
			@apply absolute h-(--height) w-(--width) origin-top overflow-hidden rounded-4xl border bg-background shadow-lg;
			transition:
				width var(--morph),
				height var(--morph),
				transform var(--morph);
		}

		.bridge.pending,
		.indicator.pending,
		.viewport.pending {
			@apply invisible;
		}

		.indicator.snap,
		.viewport.snap {
			@apply transition-none;
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
	}
</style>
