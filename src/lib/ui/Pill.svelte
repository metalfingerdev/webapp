<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    tone = "plain",
    children,
  }: { tone?: "plain" | "ok" | "warn" | "bad"; children: Snippet } = $props();
</script>

<span class="pill {tone}">{@render children()}</span>

<style lang="postcss">
  @reference 'src/app.css';

  span.pill {
    @apply inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-bold sunken;

    &.ok {
      @apply raised-success text-foreground;
    }
    &.warn {
      @apply raised-secondary text-on-secondary;
    }
    &.bad {
      @apply raised-danger text-foreground;
    }
  }
</style>
