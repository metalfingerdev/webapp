<script lang="ts">
  import type { Snippet } from "svelte";

  // A radio drawn as a tappable card (a plan, an address) or, with `pill`, as a small pill
  // (a short either/or choice). The native radio is kept, so keyboards and tests work as usual.
  let {
    name,
    value,
    checked,
    onchange,
    pill = false,
    children,
  }: {
    name: string;
    value: string;
    checked: boolean;
    onchange: () => void;
    pill?: boolean;
    children: Snippet;
  } = $props();
</script>

<label class="choice" class:pill class:on={checked}>
  <input type="radio" {name} {value} {checked} {onchange} />
  <span class="body">{@render children()}</span>
</label>

<style lang="postcss">
  @reference 'src/app.css';

  label.choice {
    @apply relative flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-4 raised press;

    /* The real radio is visible in the card style, hidden in the pill style */
    input {
      @apply mt-1 size-5 shrink-0 text-primary;
    }
    span.body {
      @apply flex min-w-0 flex-col;
    }
    &.on {
      @apply sunken;
    }
    &.pill {
      @apply items-center justify-center rounded-full px-4 py-2 font-bold;

      input {
        @apply sr-only;
      }
      &.on {
        @apply raised-primary text-foreground;
      }
    }
  }
</style>
