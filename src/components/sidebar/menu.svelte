<script lang="ts">
	// import { resolve } from '$app/paths';
	import { useSidebar } from '$lib/sidebar/index.js';
	import { ChevronRight } from '@lucide/svelte';

	const sidebar = useSidebar();
</script>

<menu>
	<span>Explore</span>
	<button onclick={() => sidebar.navigate('shop')}
		>Shop <span><ChevronRight size={20} /></span></button
	>
	<button onclick={() => sidebar.navigate('school')}
		>School <span><ChevronRight size={20} /></span></button
	>
	<button onclick={() => sidebar.navigate('books')}
		>Books <span><ChevronRight size={20} /></span></button
	>
	<button onclick={() => sidebar.navigate('uniform')}
		>Uniform <span><ChevronRight size={20} /></span></button
	>
	<button onclick={() => sidebar.navigate('stationary')}
		>Stationary <span><ChevronRight size={20} /></span></button
	>
</menu>

<style lang="postcss">
	@reference 'src/app.css';

	menu {
		@apply m-4 grid justify-items-start gap-2 font-medium;

		span {
			@apply p-2 font-semibold text-neutral-600;
		}

		button {
			@apply flex h-12 w-full items-center justify-between squircle-4xl px-2 py-4 text-lg;

			&:hover {
				@apply bg-neutral-100;
			}
		}
	}
</style>
