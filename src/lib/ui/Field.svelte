<script lang="ts">
  import type { Snippet } from "svelte";

  // A labelled form control. The control is whatever native input, select or textarea is passed
  // in: native pickers are best on cheap phones, and the tests drive them as they are.
  let {
    label,
    hint,
    hideLabel = false,
    error,
    errorId,
    children,
  }: {
    label: string;
    hint?: string;
    /** A message for this field; link the control to it with aria-describedby={errorId} */
    error?: string;
    errorId?: string;
    /** Keep the label for screen readers only, when a heading already says it */
    hideLabel?: boolean;
    children: Snippet;
  } = $props();
</script>

<div class="field">
  <label>
    <span class="caption" class:sr-only={hideLabel}>{label}</span>
    {@render children()}
  </label>
  {#if hint}<p class="hint">{hint}</p>{/if}
  {#if error}<p id={errorId} class="problem">{error}</p>{/if}
</div>

<style lang="postcss">
  @reference 'src/app.css';

  div.field {
    @apply flex flex-col gap-1.5;

    label {
      @apply flex flex-col gap-1.5;
    }
    span.caption {
      @apply text-sm font-bold;
    }
    p.hint {
      @apply text-xs text-text-muted;
    }
    p.problem {
      @apply text-sm font-semibold text-danger;
    }
    /* The control is passed in, so it is reached with :global */
    :global(:is(input:not([type="radio"], [type="checkbox"]), select, textarea)) {
      @apply min-h-11 w-full rounded-xl border-0 px-4 py-2 text-text sunken;
    }
    :global(textarea) {
      @apply min-h-24;
    }
    :global(:is(input, textarea)::placeholder) {
      @apply text-text-muted;
    }
    :global(:is(input, select, textarea):focus-visible) {
      @apply outline-2 outline-offset-2 outline-primary;
    }
  }
</style>
