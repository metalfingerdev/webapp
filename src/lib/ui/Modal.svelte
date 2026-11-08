<script lang="ts">
  import { Dialog } from "bits-ui";
  import type { Snippet } from "svelte";
  import XIcon from "@lucide/svelte/icons/x";

  // A box in the middle of the screen on a laptop, the whole screen on a phone. The content is
  // only mounted while it is open, so a form inside starts fresh every time.
  let {
    open = $bindable(false),
    title,
    closeLabel,
    children,
  }: {
    open?: boolean;
    title: string;
    closeLabel: string;
    children: Snippet;
  } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="ui-modal-overlay" />
    <Dialog.Content class="ui-modal">
      <Dialog.Title class="sr-only">{title}</Dialog.Title>
      <Dialog.Close class="ui-modal-close" aria-label={closeLabel}>
        <XIcon size={20} aria-hidden="true" />
      </Dialog.Close>
      <div class="ui-modal-body">{@render children()}</div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style lang="postcss">
  @reference 'src/app.css';

  /* Bits renders these elements itself, so they are styled as global */
  :global {
    div.ui-modal-overlay {
      @apply fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px];
    }
    div.ui-modal {
      @apply fixed inset-0 z-50 flex flex-col overflow-y-auto text-text floating;

      button.ui-modal-close {
        @apply absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full raised press;
      }
      div.ui-modal-body {
        @apply flex flex-1 flex-col justify-center p-4 pt-16;
      }
      @media (min-width: 640px) {
        @apply inset-auto top-1/2 left-1/2 max-h-[90dvh] w-[30rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl;

        div.ui-modal-body {
          @apply p-8 pt-16;
        }
      }
    }
  }
</style>
