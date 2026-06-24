<!--  src/routes/(app)/+layout.svelte  -->

<script lang="ts">
	import { createSvelteAuthClient } from '$lib/svelte/index.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import { App } from '$components/app/index.js';

	let { children, data } = $props();

	createSvelteAuthClient({
		authClient,
		getServerState: () => data.authState
	});
</script>

<App {data}>{@render children()}</App>
