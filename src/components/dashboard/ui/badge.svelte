<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'green' | 'blue' | 'amber' | 'red';

	let { tone = 'neutral', children }: { tone?: Tone; children: Snippet } = $props();
</script>

<span class="badge" data-tone={tone}>{@render children()}</span>

<style lang="postcss">
	@reference 'src/app.css';

	.badge {
		@apply inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize;
	}
	.badge[data-tone='neutral'] {
		@apply bg-neutral-100 text-neutral-700;
	}
	.badge[data-tone='green'] {
		@apply bg-green-100 text-green-700;
	}
	.badge[data-tone='blue'] {
		@apply bg-blue-100 text-blue-700;
	}
	.badge[data-tone='amber'] {
		@apply bg-amber-100 text-amber-700;
	}
	.badge[data-tone='red'] {
		@apply bg-red-100 text-red-700;
	}
</style>
