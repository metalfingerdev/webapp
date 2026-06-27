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
		@apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors;
		@apply focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none;
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
		@apply bg-neutral-900 text-white hover:bg-neutral-800;
	}
	.btn[data-variant='outline'] {
		@apply border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100;
	}
	.btn[data-variant='ghost'] {
		@apply text-neutral-700 hover:bg-neutral-100;
	}
	.btn[data-variant='destructive'] {
		@apply bg-red-600 text-white hover:bg-red-700;
	}
</style>
