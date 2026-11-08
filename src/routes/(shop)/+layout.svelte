<script lang="ts">
	import NavBar from '#lib/store/NavBar.svelte';
	import Footer from '#lib/store/Footer.svelte';
	import { provideCart } from '#lib/store/cart.svelte.js';
	import { provideDrawer } from '#lib/store/drawer.svelte.js';

	let { data, children } = $props();
	provideCart(provideDrawer());
</script>

<NavBar categories={data.categories} schools={data.schools} whatsapp={data.contact.whatsapp} />
<main class="page">{@render children()}</main>
<Footer name={data.contact.businessName} gstin={data.contact.gstin} />

<style lang="postcss">
	@reference 'src/app.css';

	/* The magazine's page: chapters inside it run the full width of this column */
	main.page {
		@apply mx-auto min-h-[60dvh] max-w-6xl px-3 pt-6 sm:px-4;
	}
</style>
