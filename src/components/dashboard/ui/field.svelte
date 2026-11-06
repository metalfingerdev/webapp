<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		hint,
		class: cls = '',
		children
	}: {
		label: string;
		hint?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<label class="field {cls}">
	<span class="lbl">{label}</span>
	{@render children()}
	{#if hint}<span class="hint">{hint}</span>{/if}
</label>

<style lang="postcss">
	@reference 'src/app.css';

	.field {
		@apply grid gap-1.5;

		.lbl {
			@apply text-sm font-bold;
		}

		.hint {
			@apply text-xs text-text-muted;
		}

		/* Style whatever control is slotted in (input / select). */
		:global(input),
		:global(select) {
			--fill: var(--color-foreground);
			@apply h-9 w-full rounded-lg bg-foreground text-sm edge-flat focus:border-primary focus:ring-0;
		}
	}
</style>
