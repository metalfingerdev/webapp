<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	// Icons
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	toastOptions={{
		unstyled: true,
		classes: {
			toast: 'ui-toast',
			title: 'ui-toast-title',
			description: 'ui-toast-text',
			action: '',
			actionButton: '',
			cancelButton: '',
			closeButton: 'ui-toast-close',
			default: '',
			info: '',
			success: 'ui-toast-success',
			error: 'ui-toast-error',
			loading: '',
			warning: 'ui-toast-warning'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="flex-shrink-0 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="flex-shrink-0 text-success" />
	{/snippet}
	{#snippet errorIcon()}
		<CircleXIcon class="flex-shrink-0 text-danger" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="flex-shrink-0" />
	{/snippet}
	{#snippet warningIcon()}
		<AlertTriangleIcon class="flex-shrink-0 text-warning" />
	{/snippet}
</Sonner>

<style lang="postcss">
	@reference 'src/app.css';

	/* Sonner renders the toasts itself, so they are styled as global */
	:global {
		.sonner-loader {
			position: static !important;
			transform: none !important;
		}
		/* A toast is a small floating card; success, error and warning tint it */
		.ui-toast {
			@apply pointer-events-auto flex w-full items-start gap-2 rounded-2xl p-4 font-semibold text-text md:w-96 floating;

			&.ui-toast-success {
				@apply bg-success-tint;
				background-image: none;
			}
			&.ui-toast-error {
				@apply bg-danger-tint;
				background-image: none;
			}
			&.ui-toast-warning {
				@apply bg-secondary-tint;
				background-image: none;
			}
		}
		.ui-toast-title {
			@apply text-sm leading-tight font-bold break-words;
		}
		.ui-toast-text {
			@apply mt-1 line-clamp-2 text-xs text-text-muted;
		}
		.ui-toast-close {
			@apply order-last ml-auto p-1 text-xs;
		}
	}
</style>
