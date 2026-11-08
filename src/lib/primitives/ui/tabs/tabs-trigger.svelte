<script lang="ts">
	import { Tabs } from 'bits-ui';
	import type { ComponentProps } from 'svelte';
	import { cn } from '../../utils.js';

	let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof Tabs.Trigger> = $props();
</script>

<Tabs.Trigger bind:ref class={cn('ui-tab', className)} {...restProps} />

<style lang="postcss">
	@reference 'src/app.css';

	:global button.ui-tab {
		@apply inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 font-bold whitespace-nowrap text-text-muted;

		&:hover {
			@apply text-text;
		}
		&[data-state='active'] {
			@apply raised text-text;
		}
		&:disabled {
			@apply pointer-events-none opacity-50;
		}
		[data-orientation='vertical'] & {
			@apply w-full justify-start text-left;
		}
	}
</style>
