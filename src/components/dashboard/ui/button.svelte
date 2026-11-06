<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'default' | 'outline' | 'ghost' | 'destructive';
	type Size = 'sm' | 'md' | 'icon';

	let {
		variant = 'default',
		size = 'md',
		class: cls = '',
		children,
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		class?: string;
		children: Snippet;
	} & HTMLButtonAttributes = $props();
</script>

<button class="btn {cls}" data-variant={variant} data-size={size} {...rest}>
	{@render children()}
</button>

<style lang="postcss">
	@reference 'src/app.css';

	.btn {
		--fill: var(--color-foreground);
		@apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-bold whitespace-nowrap text-text transition-colors edge-flat;
		@apply focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary;
		@apply disabled:pointer-events-none disabled:opacity-50;
	}

	.btn[data-size='md'] {
		@apply h-9 px-4;
	}
	.btn[data-size='sm'] {
		@apply h-8 px-3 text-xs;
	}
	.btn[data-size='icon'] {
		@apply h-9 w-9;
	}

	.btn[data-variant='default'] {
		--fill: var(--color-primary);
		@apply bg-primary text-foreground;
	}
	.btn[data-variant='outline'] {
		@apply hover:bg-midground;
	}
	.btn[data-variant='ghost'] {
		@apply border-transparent bg-transparent hover:bg-background;
	}
	.btn[data-variant='destructive'] {
		--fill: var(--color-danger);
		@apply bg-danger text-foreground;
	}
</style>
