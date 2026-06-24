<script lang="ts">
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { resolve } from '$app/paths';
	import { useCart } from '$lib/cart/index.js'; // Consume your existing context hook
	import { useAuth } from '$lib/svelte/index.js';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { ChevronDown, House, Menu, ShoppingCart, LogInIcon } from '@lucide/svelte';

	const auth = useAuth();
	const sidebar = useSidebar();
	const cart = useCart();
	const userQuery = useQuery(api.auth.getCurrentUser);
	const navItems = [
		{ id: 'getting-started', label: 'Getting started' },
		{ id: 'components', label: 'Components' }
	];

	let isMenuOpen = $state(false);
	let activeIndex = $state<number | null>(null);
	let viewportWidth = $state(0);
	let viewportHeight = $state(0);
	let viewportX = $state(0);
	let indicatorX = $state(0);
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let navbarRef: HTMLElement | undefined;
	let triggerRefs = $state<HTMLButtonElement[]>([]);
	let panelRefs = $state<HTMLDivElement[]>([]);

	$effect(() => {
		function handleDocumentClick(event: MouseEvent) {
			if (navbarRef && !navbarRef.contains(event.target as Node)) {
				isMenuOpen = false;
				activeIndex = null;
			}
		}

		if (isMenuOpen) {
			window.addEventListener('click', handleDocumentClick);
		}

		return () => window.removeEventListener('click', handleDocumentClick);
	});

	function handleMouseLeave() {
		// Slight delay before closing to prevent accidental snapping
		timeoutId = setTimeout(() => {
			isMenuOpen = false;
			activeIndex = null;
		}, 150);
	}
	function handleMouseEnter(index: number) {
		clearTimeout(timeoutId);
		activeIndex = index;
		isMenuOpen = true;
		if (activeIndex !== index) {
			activeIndex = index;
		}

		requestAnimationFrame(() => {
			const trigger = triggerRefs[index];
			const panel = panelRefs[index];

			if (!trigger || !panel || !navbarRef) return;

			viewportWidth = panel.offsetWidth;
			viewportHeight = panel.offsetHeight;

			const navRect = navbarRef.getBoundingClientRect();
			const triggerRect = trigger.getBoundingClientRect();

			const triggerCenter = triggerRect.left - navRect.left + triggerRect.width / 2;

			viewportX = triggerCenter - viewportWidth / 2;
			indicatorX = triggerCenter - 6;
		});
	}
</script>

<nav class="bar" bind:this={navbarRef} onmouseleave={handleMouseLeave}>
	<menu class="left">
		<li class="nav-item">
			<a class="link" href={resolve('/')}>
				<House />
			</a>
		</li>
		{#if userQuery.data?.role === 'admin' || userQuery.data?.role === 'developer'}
			<li>
				<a class="link" id="dashboard" href={resolve('/dashboard')}>dashboard</a>
			</li>
		{/if}
	</menu>

	<menu class="center">
		{#each navItems as item, i}
			<li class="nav-item">
				<button
					class="trigger {activeIndex === i ? 'active' : ''}"
					bind:this={triggerRefs[i]}
					onmouseenter={() => handleMouseEnter(i)}
					onfocus={() => handleMouseEnter(i)}
				>
					{item.label} <span class="caret"><ChevronDown size={15} /></span>
				</button>
			</li>
		{/each}
		<li class="nav-item">
			<a
				class="link"
				href={resolve('/dashboard')}
				onmouseenter={handleMouseLeave}
				onfocus={handleMouseLeave}>Dashboard</a
			>
		</li>
		<li class="nav-item">
			<a
				class="link"
				href={resolve('/dashboard')}
				onmouseenter={handleMouseLeave}
				onfocus={handleMouseLeave}>Dashboard</a
			>
		</li>
		<li class="nav-item">
			<a
				class="link"
				href={resolve('/dashboard')}
				onmouseenter={handleMouseLeave}
				onfocus={handleMouseLeave}>Dashboard</a
			>
		</li>
	</menu>

	<menu class="right">
		{#if auth.isAuthenticated}
			<li class="nav-item">
				<button class="link" onclick={() => sidebar.open('user')}> profile </button>
			</li>
		{:else}
			<li class="nav-item">
				<button class="link" onclick={() => sidebar.open('auth')}>
					<LogInIcon />
				</button>
			</li>
		{/if}

		<li class="nav-item">
			<button class="link" onclick={() => sidebar.open('cart')}>
				<ShoppingCart />
				{#if !cart.isEmpty}
					<span class="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-red-500"></span>
				{/if}
			</button>
		</li>

		<li class="nav-item">
			<button class="link" onclick={() => sidebar.open('default')}>
				<Menu />
			</button>
		</li>
	</menu>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="viewport-container {isMenuOpen ? 'is-open' : ''}"
		onmouseenter={() => clearTimeout(timeoutId)}
		onmouseleave={handleMouseLeave}
	>
		<div class="indicator" style="transform: translateX({indicatorX}px) rotate(45deg);"></div>

		<div
			class="viewport"
			style="width: {viewportWidth}px; height: {viewportHeight}px; transform: translateX({viewportX}px);"
		>
			<div class="content-panel {activeIndex === 0 ? 'active' : ''}" bind:this={panelRefs[0]}>
				<div class="panel-layout getting-started-layout">
					<div class="hero-card">
						<h4>Bits UI</h4>
						<p>The headless components for Svelte.</p>
					</div>
					<ul class="link-list">
						<li><strong>Introduction</strong></li>
						<li><strong>Getting Started</strong></li>
						<li><strong>Styling</strong></li>
					</ul>
				</div>
			</div>

			<div class="content-panel {activeIndex === 1 ? 'active' : ''}" bind:this={panelRefs[1]}>
				<ul class="grid-list">
					<li>
						<strong>Alert Dialog</strong>
						<p>A modal dialog...</p>
					</li>
					<li>
						<strong>Link Preview</strong>
						<p>For sighted users...</p>
					</li>
					<li>
						<strong>Progress</strong>
						<p>Displays an indicator...</p>
					</li>
					<li>
						<strong>Scroll Area</strong>
						<p>Visually separates content.</p>
					</li>
				</ul>
			</div>
		</div>
	</div>
</nav>

<style lang="postcss">
	@reference 'src/app.css';

	/* Base Layout */
	nav.bar {
		@apply relative flex justify-between;

		menu {
			@apply mx-1 mt-1 flex rounded-full p-1 shadow;

			li.nav-item {
				@apply mx-0;

				button.trigger {
					@apply inline-flex cursor-pointer items-center gap-1 rounded-full px-4 py-2 transition;

					.caret {
						transition: transform 0.2s;
					}

					&:hover,
					&.active {
						@apply bg-neutral-100;

						.caret {
							transform: rotate(180deg);
						}
					}
				}

				.link {
					@apply inline-flex cursor-pointer items-center gap-1 rounded-full px-4 py-2 transition;

					&:hover {
						@apply bg-neutral-100;
					}
				}
			}
		}

		.viewport-container {
			@apply opacity-0 transition-[opacity,transform] duration-300 ease-in-out perspective-distant;
			@apply pointer-events-none absolute top-full left-0 z-10 mt-2 transform-[translateY-10_scale0.95];

			&.is-open {
				@apply pointer-events-auto transform-[translateY(0)_scale1] opacity-100;
			}

			.indicator {
				@apply absolute -top-1 z-11 h-2 w-2 border-t border-l bg-white transition-[opacity,transform] duration-300 ease-in-out;
			}

			.viewport {
				@apply absolute origin-top overflow-hidden rounded-4xl border shadow-lg transition-[width,height,transform] duration-300 ease-in-out;

				/* Content Panels */
				.content-panel {
					@apply pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-200;
				}

				.content-panel.active {
					@apply pointer-events-auto opacity-100;
				}
			}
		}
	}
</style>
