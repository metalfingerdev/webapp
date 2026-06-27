<script lang="ts">
	// src/components/sidebar/sidebar.svelte
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { Menu, Cart, Auth, User, Category, School } from '$components/sidebar/index.js';
	import { X, ChevronLeft, Search, User as UserIcon, LogIn, ShoppingCart } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { useAuth } from '$lib/svelte/index.js';
	import { useCart } from '$lib/cart/service.svelte.js';
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';

	// Shared timing so the header button and the  animate as one. 500ms is
	// deliberately slow for now so the motion is easy to judge.
	const DURATION = 300;
	// Slide distances: the  travels ~its full width; the header rides along
	// with a subtle nudge. Same duration/easing keeps them locked in sync.
	const _X = 120;

	let { data } = $props();

	const sidebar = useSidebar();
	const auth = useAuth();
	const cart = useCart();
	const nav = useNavbar();
	let dialogElement: HTMLDialogElement;

	// The navbar search overlay renders behind this modal dialog, so close the
	// sidebar first, then expand the navbar pill's search field. The open is
	// deferred a frame: the click that triggered it must finish propagating
	// before the navbar's "click-outside → dismiss" listener attaches, or that
	// same click closes the panel the instant it opens.
	function openSearch() {
		sidebar.close();
		requestAnimationFrame(() => nav.openSearch());
	}

	// Handle the HTMLDialogElement open/close state based on the sidebar service rune
	$effect(() => {
		if (!dialogElement) return;
		if (sidebar.isOpen && !dialogElement.open) dialogElement.showModal();
		else if (!sidebar.isOpen && dialogElement.open) dialogElement.close();
	});
</script>

<dialog
	bind:this={dialogElement}
	onclose={() => sidebar.close()}
	closedby="any"
	id="sidebar-dialog"
>
	<header>
		<!-- Same {#key}/fly slide as the views below, so the Menu link / back
		     button slide in sync with the view they belong to (hims.com-style). -->
		<div class="nav">
			{#key sidebar.view}
				<div
					class="nav-slot"
					in:fly={{ x: sidebar.direction * _X, duration: DURATION, easing: cubicOut }}
					out:fly={{ x: sidebar.direction * -_X, duration: DURATION, easing: cubicOut }}
				>
					{#if sidebar.view === 'default'}
						<a href={resolve('/')}>Menu</a>
					{:else}
						<button onclick={() => sidebar.back()}><ChevronLeft size={24} /></button>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Static header actions (search / account / cart / close). They live
		     outside the sliding .nav region and carry no transition — same as the
		     close button (hims.com-style icon row). -->
		<div class="actions">
			<button aria-label="Search" onclick={openSearch}>
				<Search size={20} />
			</button>

			{#if auth.isAuthenticated}
				<button aria-label="Account" onclick={() => sidebar.show('user')}>
					<UserIcon size={20} />
				</button>
			{:else}
				<button aria-label="Log in" onclick={() => sidebar.show('auth')}>
					<LogIn size={20} />
				</button>
			{/if}

			<button class="cart" aria-label="Cart" onclick={() => sidebar.show('cart')}>
				<ShoppingCart size={20} />
				{#if !cart.isEmpty}<span class="dot"></span>{/if}
			</button>

			<button aria-label="Close" onclick={sidebar.close}><X size={24} /></button>
		</div>
	</header>

	<!-- {#key} remounts the  on every view change; fly drives the carousel.
	     direction flips which side new content enters from (and old exits to):
	     forward enters from the right, back from the left. -->
	<div class="views">
		{#key sidebar.view}
			<div
				class="view"
				in:fly={{ x: sidebar.direction * _X, duration: DURATION, easing: cubicOut }}
				out:fly={{ x: sidebar.direction * -_X, duration: DURATION, easing: cubicOut }}
			>
				{#if sidebar.view === 'auth'}
					<Auth {data} />
				{:else if sidebar.view === 'user'}
					<User />
				{:else if sidebar.view === 'shop'}
					<Category view="shop" />
				{:else if sidebar.view === 'cart'}
					<Cart />
				{:else if sidebar.view === 'books'}
					<Category view="books" />
				{:else if sidebar.view === 'uniform'}
					<Category view="uniform" />
				{:else if sidebar.view === 'stationary'}
					<Category view="stationary" />
				{:else if sidebar.view === 'school'}
					<School />
				{:else}
					<Menu />
				{/if}
			</div>
		{/key}
	</div>
</dialog>

<style lang="postcss">
	@reference 'src/app.css';

	dialog {
		/* min-h-screen (not h-dvh) keeps full height: min-height beats the modal
		   <dialog> UA max-height clamp that was cutting it short. Defined width is
		   needed so the absolutely-overlaid sliding  has something to size to. */
		@apply fixed inset-[0_0_0_auto] max-h-none min-h-screen w-[calc(100%-4rem)] max-w-none flex-col squircle-l-4xl sm:w-96;

		/* Drawer slide (hims.com-style): off-canvas to the right when closed.
		   allow-discrete on display + overlay keeps the modal in the top layer
		   through the exit, so the slide-out actually plays before it's hidden. */
		translate: 100% 0;
		transition:
			translate 300ms ease,
			overlay 300ms ease allow-discrete,
			display 300ms ease allow-discrete;

		/* display:flex only when open, else it beats the UA `:not([open]){display:none}`. */
		&[open] {
			@apply flex;
			translate: 0 0;

			/* Entry starts off-canvas, then transitions to translate:0. */
			@starting-style {
				translate: 100% 0;
			}
		}

		/* Backdrop fades in/out with the panel. */
		&::backdrop {
			background-color: rgb(0 0 0 / 0);
			transition:
				background-color 300ms ease,
				overlay 300ms ease allow-discrete,
				display 300ms ease allow-discrete;
		}

		&[open]::backdrop {
			background-color: rgb(0 0 0 / 0.4);

			@starting-style {
				background-color: rgb(0 0 0 / 0);
			}
		}

		header {
			@apply flex w-full shrink-0 items-center justify-between p-4;
		}

		/* Static icon row — no transition, matching the close button. */
		.actions {
			@apply mx-1 flex items-center gap-4;

			button {
				@apply inline-flex cursor-pointer items-center;
			}

			.cart {
				@apply relative;
			}

			.dot {
				@apply absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-red-500;
			}
		}

		/* Clip region for the sliding nav button — mirrors `.views` for the header.
		   Single-cell grid: the keyed slots stack in the same cell so the old/new
		   button overlap during the fly, with no absolute positioning. */
		.nav {
			@apply grid h-6 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden;
		}

		.nav-slot {
			@apply col-start-1 row-start-1 flex items-center;
		}

		/* Sliding viewport — clips the views as they fly. Same single-cell grid
		   stack as `.nav`; the Svelte `fly` in the markup drives the motion. */
		.views {
			@apply grid flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden;
		}

		.view {
			/* overflow-x-clip, not just overflow-y-auto: setting only the Y axis
			   makes the spec compute overflow-x as `auto`, so the fly's X translate
			   spawns a stray horizontal scrollbar. Clip the X to kill it. */
			@apply col-start-1 row-start-1 overflow-x-clip overflow-y-auto;
		}
	}
</style>
