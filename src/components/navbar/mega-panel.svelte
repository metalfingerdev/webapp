<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useNavbar } from '$lib/navbar/navbar.svelte.js';
	import MegaItem from './mega-item.svelte';

	type MenuItem = { title: string; href: string; description: string };

	// `children` renders ahead of the items (panel 0 uses it for the hero card).
	let { index, items, children }: { index: number; items: MenuItem[]; children?: Snippet } =
		$props();

	const nav = useNavbar();

	type Motion = 'from-start' | 'from-end' | 'to-start' | 'to-end' | null;

	const motion = $derived.by((): Motion => {
		const cur = nav.activeIndex;
		const prev = nav.previousIndex;
		if (cur === prev) return null;
		if (cur === index) return prev === null ? null : cur > prev ? 'from-end' : 'from-start';
		if (prev === index) return cur === null ? null : cur > prev ? 'to-start' : 'to-end';
		return null;
	});
</script>

<div
	class="content-panel"
	class:active={nav.activeIndex === index}
	data-motion={motion}
	bind:this={nav.panelRefs[index]}
>
	<ul class="panel-grid">
		{@render children?.()}
		{#each items as item (item.href)}
			<MegaItem title={item.title} href={item.href} content={item.description} />
		{/each}
	</ul>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.content-panel {
		@apply pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-250 ease-[ease];

		&.active {
			@apply pointer-events-auto opacity-100;
		}

		&[data-motion='from-start'] {
			animation: nav-enter-from-left var(--motion);
		}
		&[data-motion='from-end'] {
			animation: nav-enter-from-right var(--motion);
		}
		&[data-motion='to-start'] {
			animation: nav-exit-to-left var(--motion);
		}
		&[data-motion='to-end'] {
			animation: nav-exit-to-right var(--motion);
		}
	}

	.panel-grid {
		@apply m-0 grid list-none gap-x-2.5 p-3 sm:w-150 sm:grid-flow-col sm:grid-rows-3 sm:p-5.5;
	}

	@keyframes nav-enter-from-right {
		from {
			opacity: 0;
			transform: translateX(var(--slide));
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	@keyframes nav-enter-from-left {
		from {
			opacity: 0;
			transform: translateX(calc(-1 * var(--slide)));
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	@keyframes nav-exit-to-right {
		from {
			opacity: 1;
			transform: translateX(0);
		}
		to {
			opacity: 0;
			transform: translateX(var(--slide));
		}
	}
	@keyframes nav-exit-to-left {
		from {
			opacity: 1;
			transform: translateX(0);
		}
		to {
			opacity: 0;
			transform: translateX(calc(-1 * var(--slide)));
		}
	}
</style>
