<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { ComponentProps } from 'svelte';
	import { cn } from '../../utils.js';

	type Side = 'bottom' | 'top' | 'left' | 'right';

	let {
		ref = $bindable(null),
		class: className,
		side = 'bottom' as Side,
		children,
		...restProps
	}: ComponentProps<typeof Dialog.Content> & { side?: Side } = $props();

	const keepOpenForToasts = (event: PointerEvent) => {
		if (event.target instanceof Element && event.target.closest('[data-sonner-toast]')) {
			event.preventDefault();
		}
	};
</script>

<Dialog.Portal>
	<Dialog.Overlay class="ui-dialog-overlay" />
	<Dialog.Content
		bind:ref
		data-side={side}
		class={cn('ui-drawer', className)}
		onInteractOutside={keepOpenForToasts}
		{...restProps}
	>
		{@render children?.()}
	</Dialog.Content>
</Dialog.Portal>

<style lang="postcss">
	@reference 'src/app.css';

	/* Bits renders this element itself, so it is styled as global */
	:global div.ui-drawer {
		@apply fixed z-50 flex h-auto flex-col gap-4 overflow-y-auto p-6 text-text floating;

		&[data-side='bottom'] {
			@apply inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl;
		}
		&[data-side='top'] {
			@apply inset-x-0 top-0 max-h-[85dvh] rounded-b-3xl;
		}
		&[data-side='right'] {
			@apply inset-y-0 right-0 w-3/4 rounded-l-3xl sm:max-w-sm;
		}
		&[data-side='left'] {
			@apply inset-y-0 left-0 w-3/4 rounded-r-3xl sm:max-w-sm;
		}
	}
</style>
