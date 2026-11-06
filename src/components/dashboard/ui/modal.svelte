<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	let {
		open = $bindable(false),
		title,
		children,
		footer,
		onclose
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	} = $props();

	let el = $state<HTMLDialogElement>();

	$effect(() => {
		if (!el) return;
		if (open && !el.open) el.showModal();
		else if (!open && el.open) el.close();
	});
</script>

<dialog
	bind:this={el}
	class="modal"
	closedby="any"
	onclose={() => {
		open = false;
		onclose?.();
	}}
>
	<header class="head">
		<h2>{title}</h2>
		<button class="x" type="button" aria-label="Close" onclick={() => (open = false)}>
			<X size={18} />
		</button>
	</header>

	<div class="body">
		{@render children()}
	</div>

	{#if footer}
		<footer class="foot">
			{@render footer()}
		</footer>
	{/if}
</dialog>

<style lang="postcss">
	@reference 'src/app.css';

	.modal {
		--fill: var(--color-foreground);
		@apply m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-foreground p-0 text-text edge;

		&::backdrop {
			@apply bg-black/40;
		}
	}

	.head {
		@apply flex items-center justify-between border-b-2 border-border-muted px-5 py-4;

		h2 {
			@apply text-base font-extrabold;
		}

		.x {
			@apply cursor-pointer rounded-md p-1 text-text-muted hover:bg-midground;
		}
	}

	.body {
		@apply grid max-h-[70dvh] gap-4 overflow-y-auto px-5 py-4;
	}

	.foot {
		@apply flex justify-end gap-2 border-t-2 border-border-muted px-5 py-4;
	}
</style>
