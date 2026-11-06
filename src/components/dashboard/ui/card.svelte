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
		--fill: var(--color-foreground);
		@apply rounded-xl bg-foreground edge-flat;
	}
</style>
