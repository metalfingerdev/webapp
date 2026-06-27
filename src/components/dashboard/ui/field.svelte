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
			@apply text-sm font-medium text-neutral-700;
		}

		.hint {
			@apply text-xs text-neutral-500;
		}

		/* Style whatever control is slotted in (input / select). */
		:global(input),
		:global(select) {
			@apply h-9 w-full rounded-md border-neutral-300 text-sm focus:border-neutral-900 focus:ring-0;
		}
	}
</style>
