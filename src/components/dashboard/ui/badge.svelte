<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'green' | 'blue' | 'amber' | 'red';

	let { tone = 'neutral', children }: { tone?: Tone; children: Snippet } = $props();
</script>

<span class="badge" data-tone={tone}>{@render children()}</span>

<style lang="postcss">
	@reference 'src/app.css';

	.badge {
		--fill: var(--color-foreground);
		@apply inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-xs font-bold text-text capitalize edge-flat;
	}
	.badge[data-tone='neutral'] {
		@apply bg-midground;
	}
	.badge[data-tone='green'] {
		@apply border-success bg-success-tint;
	}
	.badge[data-tone='blue'] {
		@apply border-info bg-primary-tint;
	}
	.badge[data-tone='amber'] {
		@apply border-warning bg-secondary-tint;
	}
	.badge[data-tone='red'] {
		@apply border-danger bg-danger-tint;
	}
</style>
