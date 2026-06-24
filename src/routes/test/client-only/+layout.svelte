<script lang="ts">
	/**
	 * Client-only auth layout - NO SSR state
	 * Simulates a client-only auth flow
	 */
	import { createSvelteAuthClient } from '$lib/svelte/index.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import { Navbar } from '$components/index.js';

	let { children } = $props();

	// Initialize auth client WITHOUT getServerState
	// This simulates a client-only auth flow
	createSvelteAuthClient({ authClient });
</script>

<Navbar />

{@render children()}
