<script lang="ts">
	// src/components/sidebar/sidebar.svelte
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { useAuth } from '$lib/svelte/index.js';
	import { Menu, Shop, Cart, Auth, User, Checkout, Pay } from '$components/sidebar/index.js';

	let { data } = $props();

	const auth = useAuth();
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
	class="fixed inset-[0_0_0_auto] min-h-screen min-w-80 rounded-l-4xl p-4"
>
	<header class="flex gap-2">
		{#if sidebar.is.default}
			<button onclick={sidebar.close} class="mr-auto"> close </button>
		{:else}
			<button onclick={() => sidebar.navigate('default')} class="mr-auto"> Back </button>
		{/if}

		{#if auth.isAuthenticated}
			<button onclick={() => sidebar.navigate('user')}>profile</button>
		{:else}
			<button onclick={() => sidebar.open('auth')}>login</button>
		{/if}
		<button onclick={() => sidebar.navigate('cart')}>cart</button>

		<button onclick={sidebar.close}> sidebar </button>
	</header>

	{#if sidebar.is.auth}
		<Auth {data} />
	{:else if sidebar.is.user}
		<User />
	{:else if sidebar.is.shop}
		<Shop />
	{:else if sidebar.is.cart}
		<Cart />
	{:else if sidebar.is.checkout}
		<Checkout />
	{:else if sidebar.is.payment}
		<Pay />
	{:else}
		<Menu />
	{/if}
</dialog>
