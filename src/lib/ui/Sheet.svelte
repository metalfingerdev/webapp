<script lang="ts">
  import { Dialog } from "bits-ui";
  import type { Snippet } from "svelte";
  import XIcon from "@lucide/svelte/icons/x";

  // A panel over the page: slides up from the bottom on a phone, in from the right from md up
  let {
    open = $bindable(false),
    onOpenChange,
    title,
    closeLabel,
    children,
  }: {
    open?: boolean;
    /** Called when the sheet opens or closes, for parents that hold `open` themselves */
    onOpenChange?: (open: boolean) => void;
    title: string;
    closeLabel: string;
    children: Snippet;
  } = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="ui-sheet-overlay" />
    <Dialog.Content class="ui-sheet">
      <div class="ui-sheet-head">
        <Dialog.Title class="ui-sheet-title">{title}</Dialog.Title>
        <Dialog.Close class="ui-sheet-close" aria-label={closeLabel}>
          <XIcon size={20} aria-hidden="true" />
        </Dialog.Close>
      </div>
      <div class="ui-sheet-body">{@render children()}</div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style lang="postcss">
  @reference 'src/app.css';

  /* Bits renders these elements itself, so they are styled as global */
  :global {
    div.ui-sheet-overlay {
      @apply fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px];
    }
    div.ui-sheet {
      @apply fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl text-text floating;

      div.ui-sheet-head {
        @apply flex items-center justify-between gap-3 px-5 pt-4 pb-2;
      }
      div.ui-sheet-title {
        @apply type-title;
      }
      button.ui-sheet-close {
        @apply grid size-11 place-items-center rounded-full raised press;
      }
      div.ui-sheet-body {
        @apply flex flex-col gap-3 overflow-y-auto overscroll-contain p-5;
      }
      @media (min-width: 768px) {
        @apply inset-y-0 right-0 left-auto max-h-none w-md max-w-full rounded-t-none rounded-l-3xl;
      }
    }
  }
</style>
