<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		class: cls = '',
		children
	}: {
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class="card {cls}">
	{@render children()}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.card {
		@apply rounded-xl border border-neutral-200 bg-white;
	}
</style>
