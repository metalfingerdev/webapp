<script lang="ts">
	import NavBar from '#lib/store/NavBar.svelte';
	import Footer from '#lib/store/Footer.svelte';
	import { provideCart } from '#lib/store/cart.svelte.js';
	import { provideDrawer } from '#lib/store/drawer.svelte.js';

	let { data, children } = $props();
	provideCart(provideDrawer());
</script>

<NavBar
	categories={data.categories}
	schools={data.schools}
	whatsapp={data.contact.whatsapp}
/>
<div class="page">{@render children()}</div>
<Footer name={data.contact.businessName} gstin={data.contact.gstin} />

<style lang="postcss">
	@reference 'src/app.css';

	.page {
		@apply mx-auto min-h-[60dvh] max-w-6xl px-4 pt-6;
	}
</style>
