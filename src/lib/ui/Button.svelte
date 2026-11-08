<script lang="ts">
  import type { Snippet } from "svelte";
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from "svelte/elements";

  // A button, or a link that looks like one when `href` is given
  let {
    variant = "plain",
    block = false,
    icon = false,
    large = false,
    href,
    children,
    ...rest
  }: {
    variant?: "plain" | "primary" | "accent" | "danger" | "success";
    block?: boolean;
    /** A square button holding just an icon or a symbol */
    icon?: boolean;
    /** Taller, for the main action of a screen */
    large?: boolean;
    href?: string;
    children: Snippet;
  } & HTMLButtonAttributes &
    HTMLAnchorAttributes = $props();
</script>

{#if href}
  <a
    {href}
    class="ui-button {variant}"
    class:block
    class:icon
    class:large
    {...rest}
  >
    {@render children()}
  </a>
{:else}
  <button
    type="button"
    class="ui-button {variant}"
    class:block
    class:icon
    class:large
    {...rest}
  >
    {@render children()}
  </button>
{/if}

<style lang="postcss">
  @reference 'src/app.css';

  :is(a, button).ui-button {
    @apply inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-bold text-text raised press;
    @apply hover:not-disabled:brightness-[1.04] disabled:opacity-50;

    &.primary {
      @apply raised-primary text-foreground;
    }
    &.accent {
      @apply raised-secondary text-on-secondary;
    }
    &.success {
      @apply raised-success text-foreground;
    }
    &.danger {
      @apply raised-danger text-foreground;
    }
    &.block {
      @apply flex w-full;
    }
    &.large {
      @apply min-h-13 px-7 text-lg;
    }
    &.icon {
      @apply min-w-11 px-0 text-lg;
    }
  }
</style>
