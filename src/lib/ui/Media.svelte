<script lang="ts">
  import type { Component } from "svelte";
  import ImageIcon from "@lucide/svelte/icons/image";

  // A photo slot. With `src` it is a lazy image of a fixed shape; without one it is a soft,
  // pressed-in placeholder in the colours of the chapter around it, ready for a photo later.
  // `slot` names the spot (data-media="home-hero"), so finding where a photo goes is a search;
  // docs/10-ui.md lists them all.
  let {
    src,
    alt = "",
    ratio = "4 / 3",
    slot,
    icon: Icon = ImageIcon,
    eager = false,
    iconSize = 28,
    width,
    height,
  }: {
    src?: string | null;
    alt?: string;
    /** The CSS aspect-ratio, e.g. "3 / 4" for a book cover */
    ratio?: string;
    slot: string;
    /** The faint icon shown while there is no photo */
    icon?: Component<{ size?: number; "aria-hidden"?: "true" }>;
    /** Load at once (the first screen's main photo); everything else loads lazily */
    eager?: boolean;
    /** Smaller for thumbnails */
    iconSize?: number;
    width?: number;
    height?: number;
  } = $props();
</script>

<figure class="media" data-media={slot} style:aspect-ratio={ratio}>
  {#if src}
    <img
      {src}
      {alt}
      {width}
      {height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  {:else}
    <span class="mark" aria-hidden="true"><Icon size={iconSize} aria-hidden="true" /></span>
  {/if}
</figure>

<style lang="postcss">
  @reference 'src/app.css';

  figure.media {
    @apply relative m-0 grid w-full place-items-center overflow-hidden sunken;
    /* A parent can set a tighter corner for thumbnails */
    border-radius: var(--media-radius, 1.25rem);
    background-image:
      radial-gradient(
        circle at 30% 20%,
        color-mix(in oklab, var(--foreground) 60%, transparent),
        transparent 60%
      ),
      linear-gradient(
        160deg,
        color-mix(in oklab, var(--accent) 14%, var(--background)),
        var(--background)
      );

    img {
      @apply absolute inset-0 size-full object-cover;
    }
    span.mark {
      @apply text-text-muted opacity-40;
    }
  }
</style>
