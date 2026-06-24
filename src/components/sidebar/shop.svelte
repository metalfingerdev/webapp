<script lang="ts">
	import { resolve } from '$app/paths';
	import { useSidebar } from '$lib/sidebar/index.js';

	const sidebar = useSidebar();
</script>

<menu>
	<button onclick={() => sidebar.navigateTo(resolve('/shop'))}>prods</button>
	<button onclick={() => sidebar.navigateTo(resolve('/shop/book'))}>books</button>
	<button onclick={() => sidebar.navigateTo(resolve('/shop/clothes'))}>clothes</button>
</menu>
