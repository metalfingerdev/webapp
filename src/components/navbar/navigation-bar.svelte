<script lang="ts">
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';
	import NavRow from './nav-row.svelte';
	import SearchPanel from './search-panel.svelte';
	import MegaMenu from './mega-menu.svelte';

	const nav = useNavbar();

	$effect(() => {
		if (!nav.isMenuOpen && !nav.isSearchOpen) return;

		function handleDocumentClick(event: MouseEvent) {
			if (nav.navbarRef && !nav.navbarRef.contains(event.target as Node)) nav.dismiss();
		}

		window.addEventListener('click', handleDocumentClick);
		return () => window.removeEventListener('click', handleDocumentClick);
	});
</script>

<nav class="bar" bind:this={nav.navbarRef} onmouseleave={nav.scheduleClose}>
	<section>
		<NavRow />
		<SearchPanel />
	</section>

	<MegaMenu />
</nav>

<style lang="postcss">
	@reference 'src/app.css';

	nav.bar {
		@apply fixed inset-x-0 top-0 z-40 flex justify-center bg-none;

		section {
			@apply m-1 flex flex-col squircle-4xl bg-background-light p-1 shadow;

			@apply max-lg:w-full;
		}
	}
</style>
