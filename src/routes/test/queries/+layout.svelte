<script lang="ts">
	/**
	 * Queries test layout - uses SSR auth state
	 */
	import { createSvelteAuthClient } from '$lib/svelte/index.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import { Navbar } from '$components/index.js';

	let { children, data } = $props();

	// Initialize auth client WITH SSR state
	createSvelteAuthClient({ authClient, getServerState: () => data.authState });
</script>

<Navbar />

{@render children()}
