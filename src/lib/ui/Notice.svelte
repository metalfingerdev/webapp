<script lang="ts">
  import type { Snippet } from "svelte";

  // A message box: info (neutral), warn (gold), bad (red). `role` is passed by the caller:
  // "status" for things that are merely true, "alert" for things the user must act on.
  let {
    tone = "info",
    role,
    children,
  }: {
    tone?: "info" | "warn" | "bad";
    role?: "status" | "alert";
    children: Snippet;
  } = $props();
</script>

<div class="notice {tone}" {role}>{@render children()}</div>

<style lang="postcss">
  @reference 'src/app.css';

  div.notice {
    @apply flex flex-col items-start gap-2 rounded-2xl p-4 text-sm raised;

    &.warn {
      @apply bg-secondary-tint;
      background-image: none;
    }
    &.bad {
      @apply bg-danger-tint;
      background-image: none;
    }
  }
</style>
