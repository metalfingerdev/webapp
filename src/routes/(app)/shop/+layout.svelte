<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	// Minimalistic nav definition
	const navItems = [
		{ label: 'All', path: '/shop' },
		{ label: 'Books', path: '/shop/book' },
		{ label: 'Clothes', path: '/shop/clothes' },
		{ label: 'Stationary', path: '/shop/stationary' }
	];
</script>

<div class="shop-layout">
	<nav>
		{#each navItems as item}
			<a href={item.path} class="link" class:active={page.url.pathname === item.path}>
				{item.label}
			</a>
		{/each}
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

<style lang="postcss">
	@reference "src/app.css";

	/* If this layout is the absolute root, you might also want to apply bg-gray-500 to the global body in your app.css */
</style>
