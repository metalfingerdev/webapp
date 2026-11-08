<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';

	// A floating card over the page, from the left (the menu) or the right (the cart, step 4). Bits UI
	// keeps focus inside, closes on Escape or a tap outside, and stops the page scrolling behind it.
	let {
		open = $bindable(false),
		side = 'left',
		title,
		closeLabel,
		head,
		children
	}: {
		open?: boolean;
		side?: 'left' | 'right';
		/** Read by screen readers; the visible heading is up to the content */
		title: string;
		closeLabel: string;
		/** The left of the top row, e.g. a back button */
		head?: Snippet;
		children: Snippet;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="store-drawer-dim" />
		<Dialog.Content class="store-drawer {side}">
			<Dialog.Title class="sr-only">{title}</Dialog.Title>
			<div class="store-drawer-head">
				<div class="store-drawer-lead">{@render head?.()}</div>
				<Dialog.Close class="store-drawer-close" aria-label={closeLabel}>
					<XIcon size={20} aria-hidden="true" />
				</Dialog.Close>
			</div>
			<div class="store-drawer-body">{@render children()}</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style lang="postcss">
	@reference 'src/app.css';

	/* Bits renders these elements itself, so they are styled globally. Bits waits for the closing
	   animation before removing them. */
	:global {
		div.store-drawer-dim {
			@apply fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px];
			animation: store-drawer-fade 240ms ease both;

			&[data-state='closed'] {
				animation-direction: reverse;
			}
		}

		div.store-drawer {
			@apply fixed inset-y-2 z-50 flex w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-[2rem] floating text-text;
			--from: -100%;
			animation: store-drawer-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both;

			&.left {
				@apply left-2;
			}
			&.right {
				@apply right-2;
				--from: 100%;
			}
			&[data-state='closed'] {
				animation: store-drawer-in 200ms ease-in reverse both;
			}

			div.store-drawer-head {
				@apply flex h-18 shrink-0 items-center justify-between gap-2 px-4;
			}
			div.store-drawer-lead {
				@apply min-w-0 flex-1;
			}
			button.store-drawer-close {
				@apply grid size-11 shrink-0 press place-items-center rounded-full raised;
			}
			div.store-drawer-body {
				@apply relative flex-1 overflow-x-hidden overflow-y-auto overscroll-contain;
			}
		}
	}

	@keyframes -global-store-drawer-in {
		from {
			transform: translateX(calc(var(--from) - 1rem));
		}
	}

	@keyframes -global-store-drawer-fade {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(div:is(.store-drawer, .store-drawer-dim)) {
			animation-duration: 1ms !important;
		}
	}
</style>
