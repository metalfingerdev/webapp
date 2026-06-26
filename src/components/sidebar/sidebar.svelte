<script lang="ts">
	// src/components/sidebar/sidebar.svelte
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { Menu, Shop, Cart, Auth, User } from '$components/sidebar/index.js';
	import { X, ChevronLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Shared timing so the header button and the  animate as one. 500ms is
	// deliberately slow for now so the motion is easy to judge.
	const DURATION = 300;
	// Slide distances: the  travels ~its full width; the header rides along
	// with a subtle nudge. Same duration/easing keeps them locked in sync.
	const _X = 120;

	let { data } = $props();

	const sidebar = useSidebar();
	let dialogElement: HTMLDialogElement;

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
		<!-- Same {#key}/--enter slide as the s below, so the Menu link / back
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

		<button onclick={sidebar.close}><X size={24} /></button>
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
					<Shop />
				{:else if sidebar.view === 'cart'}
					<Cart />
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

		/* display:flex only when open, else it beats the UA `:not([open]){display:none}`. */
		&[open] {
			@apply flex;
		}

		header {
			@apply flex w-full shrink-0 items-center justify-between p-4;
		}

		/* Clip region for the sliding nav button — mirrors `.views` for the header.
		   flex-1 makes it span up to the X; min-h matches the 24px icon button so
		   the absolutely-positioned slot has bounds. */
		.nav {
			@apply relative h-6 flex-1 overflow-hidden;
		}

		/* Same transform/timing/@starting-style as `.view` so header and 
		   slide together in the same direction. */
		.nav-slot {
			@apply absolute inset-0 flex items-center;
			transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
			transform: translateX(0);

			@starting-style {
				transform: translateX(var(--enter));
			}
		}

		/* Sliding viewport — clips the  as it slides in. */
		.views {
			@apply relative flex-1 overflow-hidden;
		}

		.view {
			@apply absolute inset-0 overflow-y-auto;
			transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
			transform: translateX(0);

			/* Where the  starts before sliding to 0 — set per-direction via --enter. */
			@starting-style {
				transform: translateX(var(--enter));
			}
		}
	}
</style>
