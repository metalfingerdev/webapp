<script lang="ts">
  import { Switch } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    checked = $bindable(false),
    children,
  }: { checked?: boolean; children: Snippet } = $props();
</script>

<label class="switch">
  <Switch.Root bind:checked class="ui-switch-track">
    <Switch.Thumb class="ui-switch-thumb" />
  </Switch.Root>
  <span>{@render children()}</span>
</label>

<style lang="postcss">
  @reference 'src/app.css';

  label.switch {
    @apply inline-flex min-h-11 cursor-pointer items-center gap-3 font-semibold;
  }
  /* Bits renders the track and thumb itself, so they are styled as global */
  :global {
    button.ui-switch-track {
      @apply relative h-8 w-14 shrink-0 rounded-full transition-colors sunken;

      &[data-state="checked"] {
        @apply bg-primary;
        background-image: none;
      }
    }
    span.ui-switch-thumb {
      @apply block size-6 translate-x-1 rounded-full transition-transform raised;

      &[data-state="checked"] {
        @apply translate-x-7 bg-foreground;
      }
    }
  }
</style>
