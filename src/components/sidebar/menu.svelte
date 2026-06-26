<script lang="ts">
	// import { resolve } from '$app/paths';
	import { useSidebar } from '$lib/sidebar/index.js';

	const sidebar = useSidebar();
</script>

<menu>
	<button onclick={() => sidebar.navigate('shop')}>Shop</button>
	<button onclick={() => sidebar.navigate('shop')}>School</button>
	<button onclick={() => sidebar.navigate('shop')}>Books</button>
	<button onclick={() => sidebar.navigate('shop')}>Uniform</button>
	<button onclick={() => sidebar.navigate('shop')}>Stationary</button>
</menu>
