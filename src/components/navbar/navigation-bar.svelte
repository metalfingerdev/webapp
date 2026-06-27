<script lang="ts">
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';
	import NavRow from './nav-row.svelte';
	import NavBreadcrumbs from './nav-breadcrumbs.svelte';
	import SearchPanel from './search-panel.svelte';
	import MegaMenu from './mega-menu.svelte';

	// Context is created in App (app-initialize) so the sidebar can share it.
	const nav = useNavbar();

	// A click outside the bar collapses any open dropdown or search panel. The
	// listener is only attached while something is open.
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
	<!-- The menu pill hosts stacked "views" below the nav row: the breadcrumb
	     trail (on /shop) and the search field. Each expands the pill in place. -->
	<menu>
		<NavRow />
		<NavBreadcrumbs />
		<SearchPanel />
	</menu>

	<MegaMenu />
</nav>

<style lang="postcss">
	@reference 'src/app.css';

	nav.bar {
		/* Floats above the page — fixed so it never pushes or reserves layout. */
		@apply fixed inset-x-0 top-0 z-40 flex justify-center;

		menu {
			/* flex-col so the search panel stacks under the nav row and the menu
			   grows to contain it. */
			@apply m-1 flex flex-col squircle-4xl bg-white p-1 shadow;

			/* On md and below the nav links collapse to just the brand, so the
			   pill spans the full width instead of hugging the few remaining
			   items. */
			@apply max-lg:w-full;
		}
	}
</style>
