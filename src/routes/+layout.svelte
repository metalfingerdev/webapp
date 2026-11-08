<script lang="ts">
	import '@fontsource-variable/manrope';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { createSvelteAuthClient } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { authClient } from '#lib/auth/api/auth-client.js';
	import { api } from '#convex/_generated/api.js';
	import { AUTH_CONSTANTS } from '#convex/auth.constants.js';
	import { Toaster } from '#lib/primitives/ui/sonner/index.js';
	import AuthProvider from '#lib/auth/ui/AuthProvider.svelte';
	import ImpersonationBanner from '#lib/admin/ui/ImpersonationBanner.svelte';

	let { children, data } = $props();

	createSvelteAuthClient({ authClient, getServerState: () => data.authState });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster position="top-center" />
<AuthProvider {api} {authClient} authConstants={AUTH_CONSTANTS}>
	{#if AUTH_CONSTANTS.admin}
		<div class="print:hidden"><ImpersonationBanner /></div>
	{/if}
	{@render children()}
</AuthProvider>
