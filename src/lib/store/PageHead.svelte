<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	// The top of a page, magazine style: an optional way back, a small label, the headline (with an
	// optional coloured second line) and a short lead. `tone` puts it in a coloured chapter; paper
	// (the default) leaves it on the page. Extra things (pills, buttons) go in as children.
	let {
		title,
		accent,
		kicker,
		lead,
		back,
		tone = 'paper',
		size = 'display',
		children
	}: {
		title: string;
		/** The coloured second line of the headline */
		accent?: string;
		/** The small label above the headline */
		kicker?: string;
		lead?: string;
		back?: { href: string; label: string };
		tone?: 'paper' | 'ink' | 'wine' | 'saffron';
		/** display for a page people browse; headline for a working page (admin, forms) */
		size?: 'display' | 'headline';
		children?: Snippet;
	} = $props();
</script>

<header class="page-head {tone} {size}">
	{#if back}
		<a class="back" href={back.href}>
			<ArrowLeftIcon size={18} aria-hidden="true" />
			{back.label}
		</a>
	{/if}
	{#if kicker}<p class="eyebrow">{kicker}</p>{/if}
	<h1 class="heading">
		{title}{#if accent}<span class="accent">{accent}</span>{/if}
	</h1>
	{#if lead}<p class="lead">{lead}</p>{/if}
	{#if children}<div class="extra">{@render children()}</div>{/if}
</header>

<style lang="postcss">
	@reference 'src/app.css';

	header.page-head {
		@apply mb-8 flex flex-col items-start gap-3 pt-2;

		&.ink {
			@apply chapter chapter-ink;
		}
		&.wine {
			@apply chapter chapter-wine;
		}
		&.saffron {
			@apply chapter chapter-saffron;
		}

		a.back {
			@apply -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-bold text-text-muted;
		}
		p.eyebrow {
			@apply type-kicker;
		}
		h1.heading {
			@apply max-w-4xl type-display;

			span.accent {
				@apply block text-accent;
			}
		}
		&.headline h1.heading {
			@apply type-headline;
		}
		p.lead {
			@apply max-w-2xl text-lg text-text-muted;
		}
		div.extra {
			@apply flex flex-wrap items-center gap-2;
		}
	}
</style>
