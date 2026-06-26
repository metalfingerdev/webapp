<script lang="ts">
	// src/components/sidebar/sidebar.svelte
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { useAuth } from '$lib/svelte/index.js';

	import { Menu, ShoppingCart, LogIn } from '@lucide/svelte';
	import { useCart } from '$lib/cart/service.svelte.js';

	const cart = useCart();
	const auth = useAuth();
	const sidebar = useSidebar();
</script>

<menu>
	{#if auth.isAuthenticated}
		<li class="nav-item">
			<button class="link" onclick={() => sidebar.show('user')}> profile </button>
		</li>
	{:else}
		<li class="nav-item">
			<button class="link" onclick={() => sidebar.show('auth')}>
				<LogIn />
			</button>
		</li>
	{/if}

	<li class="nav-item">
		<button class="link" onclick={() => sidebar.show('cart')}>
			<ShoppingCart />
			{#if !cart.isEmpty}
				<span class="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-red-500"></span>
			{/if}
		</button>
	</li>

	<li class="nav-item">
		<button
			class="link"
			onclick={() => (sidebar.isOpen ? sidebar.close() : sidebar.show('default'))}
		>
			<Menu />
		</button>
	</li>
</menu>

<style lang="postcss">
	@reference 'src/app.css';

	menu {
		@apply mt-1 mr-1 ml-auto flex items-center rounded-full p-1;

		/* Collapse the center cluster (nav links + search) on small screens;
			   the hamburger in the right menu becomes the mobile nav. */

		li.nav-item {
			@apply flex h-full items-center gap-1;

			.link {
				@apply inline-flex cursor-pointer items-center gap-1 rounded-full px-4 py-2 transition;

				&:hover {
					@apply bg-neutral-100;
				}
			}
		}
	}
</style>
