<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  // `as="a"` (with an href) makes a whole card a link; `pressable` adds the press feedback;
  // `dense` is the calmer, tighter look used all day in admin (less padding)
  let {
    as = "div",
    pressable = false,
    dense = false,
    children,
    ...rest
  }: {
    as?: "div" | "a" | "li" | "section" | "article";
    pressable?: boolean;
    dense?: boolean;
    href?: string;
    children: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
</script>

<svelte:element
  this={as}
  class="ui-card"
  class:pressable
  class:dense
  {...rest}
>
  {@render children()}
</svelte:element>

<style lang="postcss">
  @reference 'src/app.css';

  .ui-card {
    @apply block rounded-3xl p-4 raised;

    &.dense {
      @apply rounded-2xl p-3;
    }
    &.pressable {
      @apply press;
    }
  }
</style>
