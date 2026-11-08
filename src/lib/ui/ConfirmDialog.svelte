<script lang="ts">
  import { AlertDialog } from "bits-ui";

  // Asks "are you sure?" before something that cannot be undone. Replaces the browser's confirm().
  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel,
    cancelLabel,
    onconfirm,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    cancelLabel: string;
    onconfirm: () => void;
  } = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="ui-confirm-overlay" />
    <AlertDialog.Content class="ui-confirm">
      <AlertDialog.Title class="ui-confirm-title">{title}</AlertDialog.Title>
      {#if description}
        <AlertDialog.Description class="ui-confirm-text">
          {description}
        </AlertDialog.Description>
      {/if}
      <div class="ui-confirm-actions">
        <AlertDialog.Cancel class="ui-confirm-keep">{cancelLabel}</AlertDialog.Cancel>
        <AlertDialog.Action class="ui-confirm-go" onclick={onconfirm}>
          {confirmLabel}
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>

<style lang="postcss">
  @reference 'src/app.css';

  /* Bits renders these elements itself, so they are styled as global */
  :global {
    div.ui-confirm-overlay {
      @apply fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px];
    }
    div.ui-confirm {
      @apply fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl p-6 text-text floating;

      div.ui-confirm-title {
        @apply title;
      }
      div.ui-confirm-text {
        @apply text-sm text-text-muted;
      }
      div.ui-confirm-actions {
        @apply mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end;
      }
      button:is(.ui-confirm-keep, .ui-confirm-go) {
        @apply inline-flex min-h-11 items-center justify-center rounded-full px-5 font-bold raised press;
      }
      button.ui-confirm-go {
        @apply raised-danger text-foreground;
      }
    }
  }
</style>
