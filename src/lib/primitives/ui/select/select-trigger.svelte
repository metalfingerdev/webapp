<script lang="ts">
	import { Select } from 'bits-ui';
	import { getContext, type ComponentProps } from 'svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { cn } from '../../utils.js';
	import { SELECT, type SelectItem } from './select-root.svelte';

	let {
		ref = $bindable(null),
		class: className,
		placeholder,
		...restProps
	}: ComponentProps<typeof Select.Trigger> & { placeholder?: string } = $props();

	const select = getContext<{ items: SelectItem[]; value: string | undefined }>(SELECT);
	const label = $derived(select.items.find((item) => item.value === select.value)?.label);
</script>

<Select.Trigger bind:ref class={cn('ui-select-trigger', className)} {...restProps}>
	<span class:muted={!label}>{label ?? placeholder ?? ''}</span>
	<ChevronDownIcon class="size-4 shrink-0" aria-hidden="true" />
</Select.Trigger>

<style lang="postcss">
	@reference 'src/app.css';

	:global button.ui-select-trigger {
		@apply flex min-h-10 w-fit items-center justify-between gap-2 rounded-full px-4 text-sm whitespace-nowrap text-text select-none sunken;

		&:disabled {
			@apply cursor-not-allowed opacity-50;
		}
	}
	.muted {
		@apply text-text-muted;
	}
</style>
