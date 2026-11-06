<!--  src/routes/(app)/+layout.svelte  -->

<script lang="ts">
	import { App } from '#components/app/index.js';

	let { children } = $props();
</script>

<App>{@render children()}</App>
