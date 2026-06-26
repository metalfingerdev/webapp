<script lang="ts">
	// src/components/sidebar/sidebar.svelte
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { Menu, Shop, Cart, Auth, User } from '$components/sidebar/index.js';
	import { X, ChevronLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';

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
		{#if sidebar.view === 'default'}
			<a href={resolve('/')}>Menu</a>
		{:else}
			<button onclick={() => sidebar.back()}><ChevronLeft size={24} /></button>
		{/if}

		<button onclick={sidebar.close}><X size={24} /></button>
	</header>

	<!-- {#key} remounts the panel on every view change, which is what triggers the
	     @starting-style slide. `--enter` is the side it slides in FROM: forward
	     (navigate/show) from the right, back from the left. -->
	<div class="views">
		{#key sidebar.view}
			<div class="view" style="--enter: {sidebar.direction * 100}%">
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
		   needed so the absolutely-overlaid sliding panel has something to size to. */
		@apply fixed inset-[0_0_0_auto] max-h-none min-h-screen w-[calc(100%-4rem)] max-w-none flex-col squircle-l-4xl sm:w-96;

		/* display:flex only when open, else it beats the UA `:not([open]){display:none}`. */
		&[open] {
			@apply flex;
		}

		header {
			@apply flex w-full shrink-0 justify-between p-4;
		}

		/* Sliding viewport — clips the panel as it slides in. */
		.views {
			@apply relative flex-1 overflow-hidden;
		}

		.view {
			@apply absolute inset-0 overflow-y-auto;
			transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
			transform: translateX(0);

			/* Where the panel starts before sliding to 0 — set per-direction via --enter. */
			@starting-style {
				transform: translateX(var(--enter));
			}
		}
	}
</style>
