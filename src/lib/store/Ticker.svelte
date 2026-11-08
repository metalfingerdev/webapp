<script lang="ts">
	import { strings } from './strings.js';

	// A slim strip of true facts that scrolls slowly (CSS only). The line is repeated so the loop has
	// no gap; the copy is hidden from screen readers and the first copy is the readable one. It
	// pauses on hover or focus, and holds still (wrapping) for anyone who asks for less motion.
	let { lines }: { lines: string[] } = $props();
</script>

<div class="ticker" role="group" aria-label={strings.home.tickerLabel}>
	<ul class="track">
		{#each lines as line (line)}<li>{line}</li>{/each}
	</ul>
	<ul class="track" aria-hidden="true">
		{#each lines as line (line)}<li>{line}</li>{/each}
	</ul>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	/* Fixed height, so nothing below it moves */
	.ticker {
		@apply flex h-9 items-center overflow-hidden rounded-full sunken text-sm font-bold text-text-muted;
		mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
	}

	.track {
		@apply flex shrink-0 items-center;
		animation: ticker-scroll 32s linear infinite;

		li {
			@apply px-6 whitespace-nowrap;

			&::after {
				content: '·';
				@apply pl-12 text-primary;
			}
		}
	}

	.ticker:hover .track,
	.ticker:focus-within .track {
		animation-play-state: paused;
	}

	@keyframes ticker-scroll {
		to {
			transform: translateX(-100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ticker {
			@apply h-auto flex-wrap justify-center py-1;
			mask-image: none;
		}
		.track {
			animation: none;

			&[aria-hidden='true'] {
				@apply hidden;
			}
		}
	}
</style>
