<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { ChevronDown, Search, User, Menu, ShoppingCart, LogIn } from '@lucide/svelte';

	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { useAuth } from '$lib/svelte/index.js';
	import { useCart } from '$lib/cart/service.svelte.js';
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';

	const nav = useNavbar();
	const cart = useCart();
	const auth = useAuth();
	const sidebar = useSidebar();
	const userQuery = useQuery(api.auth.getCurrentUser);

	// Dropdown triggers (mega-menu), in the same order as the panels in
	// mega-menu.svelte. "Schools" is index 0 (its panel lists the bundles) and
	// also navigates to /schools on click via `href`.
	const navItems: { id: string; label: string; href?: string }[] = [
		{ id: 'schools', label: 'Schools', href: '/schools' },
		{ id: 'books', label: 'Books' },
		{ id: 'unifrom', label: 'Unifroms' },
		{ id: 'stationary', label: 'Stationary' }
	];

	const isStaff = $derived(
		userQuery.data?.role === 'admin' || userQuery.data?.role === 'developer'
	);
</script>

<div class="nav-row">
	<li class="nav-item">
		<a class="link" href={resolve('/')}> Aggarwalkart </a>
	</li>

	<li class="nav-item nav-link">
		<a class="link" href={resolve('/shop')}> Shop </a>
	</li>

	{#each navItems as item, i (item.id)}
		<li class="nav-item nav-link">
			<button
				class="trigger {nav.activeIndex === i ? 'active' : ''}"
				bind:this={nav.triggerRefs[i]}
				onmouseenter={() => nav.openPanel(i)}
				onfocus={() => nav.openPanel(i)}
				onclick={() => item.href && goto(item.href)}
			>
				{item.label} <span class="caret"><ChevronDown size={15} /></span>
			</button>
		</li>
	{/each}

	{#if isStaff}
		<li class="nav-item nav-link">
			<a class="link" id="dashboard" href={resolve('/dashboard')}>Dashboard</a>
		</li>
	{/if}

	<div class="seperator nav-link">|</div>

	<li class="nav-item max-lg:ml-auto">
		<button
			class="action {nav.isSearchOpen ? 'active' : ''}"
			aria-label="Search"
			onclick={nav.toggleSearch}
		>
			<Search size={16} />
		</button>
	</li>

	{#if auth.isAuthenticated}
		<li class="nav-item">
			<button class="action" onclick={() => sidebar.show('user')}> <User size={16} /> </button>
		</li>
	{:else}
		<li class="nav-item">
			<button class="action" onclick={() => sidebar.show('auth')}>
				<LogIn size={16} />
			</button>
		</li>
	{/if}

	<li class="nav-item">
		<button class="action" onclick={() => sidebar.show('cart')}>
			<ShoppingCart size={16} />
			{#if !cart.isEmpty}
				<span class="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
			{/if}
		</button>
	</li>

	<li class="nav-item">
		<button
			class="action"
			onclick={() => (sidebar.isOpen ? sidebar.close() : sidebar.show('default'))}
		>
			<Menu size={16} />
		</button>
	</li>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.nav-row {
		@apply flex h-10 shrink-0 items-center;
	}

	.seperator {
		@apply mx-4 flex items-center px-1 text-neutral-300 select-none;
	}

	.nav-link {
		@apply max-lg:hidden;
	}

	li.nav-item {
		@apply relative;

		button.trigger {
			@apply inline-flex cursor-pointer items-center gap-2 squircle-4xl px-4 py-2 transition;

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

		button.action {
			@apply m-1 inline-flex cursor-pointer items-center rounded-full p-3 transition;

			&:hover,
			&.active {
				@apply bg-neutral-100;
			}
		}

		.link {
			@apply inline-flex cursor-pointer items-center squircle-4xl px-4 py-2 transition;

			&:hover {
				@apply bg-neutral-100;
			}
		}
	}
</style>
