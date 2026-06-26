<script lang="ts">
	import { resolve } from '$app/paths';
	import { useSidebar } from '$lib/sidebar/index.js';

	const sidebar = useSidebar();
</script>

<menu>
	<button onclick={() => sidebar.exit(resolve('/shop'))}>prods</button>
	<button onclick={() => sidebar.exit(resolve('/shop/book'))}>books</button>
	<button onclick={() => sidebar.exit(resolve('/shop/clothes'))}>clothes</button>
</menu>
