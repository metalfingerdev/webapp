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

<menu class="row">
	<li class="st brand">
		<a class="link" href={resolve('/')}> Aggarwalkart </a>
	</li>

	<li class="st redirect">
		<a class="link" href={resolve('/shop')}> Shop </a>
	</li>

	{#each navItems as item, i (item.id)}
		<li class="st redirect">
			<button
				class="trigger {nav.activeIndex === i ? 'active' : ''}"
				bind:this={nav.triggerRefs[i]}
				onmouseenter={() => nav.hoverPanel(i)}
				onmouseleave={nav.scheduleClose}
				onfocus={() => nav.openPanel(i)}
				onclick={() => item.href && goto(item.href)}
			>
				{item.label} <span class="caret"><ChevronDown size={15} /></span>
			</button>
		</li>
	{/each}

	{#if isStaff}
		<li class="st redirect">
			<a class="link" id="dashboard" href={resolve('/dashboard')}>Dashboard</a>
		</li>
	{/if}

	<div class="seperator">|</div>

	<li class="st search">
		<button
			class="action {nav.isSearchOpen ? 'active' : ''}"
			aria-label="Search"
			onclick={nav.toggleSearch}
		>
			<Search size={16} />
		</button>
	</li>

	{#if auth.isAuthenticated}
		<li class="st user">
			<button class="action" onclick={() => sidebar.show('user')}> <User size={16} /> </button>
		</li>
	{:else}
		<li class="st login">
			<button class="action" onclick={() => sidebar.show('auth')}>
				<LogIn size={16} />
			</button>
		</li>
	{/if}

	<li class="st cart">
		<button class="action" onclick={() => sidebar.show('cart')}>
			<ShoppingCart size={16} />
			{#if !cart.isEmpty}
				<span class="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
			{/if}
		</button>
	</li>

	<li class="st menu">
		<button
			class="action"
			onclick={() => (sidebar.isOpen ? sidebar.close() : sidebar.show('default'))}
		>
			<Menu size={16} />
		</button>
	</li>
</menu>

<style lang="postcss">
	@reference 'src/app.css';

	menu.row {
		@apply flex h-10 items-center;

		div.seperator {
			@apply mx-4 hidden items-center text-text-muted select-none lg:flex;
		}

		li.st {
			@apply relative h-full w-auto text-text;

			&.brand {
				@apply font-semibold max-lg:mr-auto;
			}

			&.redirect {
				@apply max-lg:hidden;
			}

			&.search,
			&.user,
			&.login,
			&.cart,
			&.menu {
				@apply flex h-10 w-10 items-center justify-center;
			}

			a.link {
				@apply inline-flex cursor-pointer items-center squircle-4xl px-4 py-2 transition;

				&:hover {
					@apply bg-background;
				}
			}

			button {
				@apply inline-flex cursor-pointer items-center transition;

				&.trigger {
					@apply gap-2 squircle-4xl px-4 py-2;
				}

				&.action {
					@apply rounded-full p-2;
				}

				.caret {
					transition: transform 0.2s;
				}

				&:hover,
				&.active {
					@apply bg-background;

					.caret {
						transform: rotate(180deg);
					}
				}
			}
		}
	}
</style>
