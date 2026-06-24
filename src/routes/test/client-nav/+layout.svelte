<script lang="ts">
	/**
	 * Client-nav test layout - NO SSR state
	 * Tests client-side navigation after sign-in (issue #21)
	 */
	import { createSvelteAuthClient } from '$lib/svelte/index.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import { Navbar } from '$components/index.js';

	let { children } = $props();

	// Initialize auth client WITHOUT getServerState
	// This matches the reporter's scenario: client-only auth
	createSvelteAuthClient({ authClient });
</script>

<Navbar />

{@render children()}
