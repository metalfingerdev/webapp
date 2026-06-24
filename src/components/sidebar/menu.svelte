<script lang="ts">
	// import { resolve } from '$app/paths';
	import { useSidebar } from '$lib/sidebar/index.js';

	const sidebar = useSidebar();
</script>

<menu>
	<button onclick={() => sidebar.navigate('shop')}>products</button>
</menu>
