<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { strings } from './strings.js';

	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	// The Schools panel lists schools; every other panel is one top-level category
	let { category, schools }: { category?: Category; schools?: { name: string; slug: string }[] } =
		$props();
</script>

<div class="panel">
	{#if category}
		<a class="lead" href={resolve('/(shop)/shop/[category]', { category: category.slug })}>
			<span>{strings.nav.viewAll(category.name)}</span>
			<ArrowRightIcon class="size-6" aria-hidden="true" />
		</a>
		{#if category.children.length}
			<ul class="items">
				{#each category.children as child (child.slug)}
					<li>
						<a href={resolve('/(shop)/shop/[category]', { category: child.slug })}>{child.name}</a>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if schools}
		<!-- Step 3 turns these into links to each school's sets -->
		<p class="lead plain">{strings.nav.schools}</p>
		<ul class="items">
			{#each schools as school (school.slug)}<li class="plain">{school.name}</li>{/each}
		</ul>
		<p class="note">{strings.nav.schoolsSoon}</p>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.panel {
		@apply grid gap-4 p-5 md:grid-cols-[1fr_2fr] md:p-8;
	}
	.lead {
		@apply flex items-start justify-between gap-3 text-3xl leading-tight font-extrabold;
	}
	.plain {
		@apply block;
	}
	.items {
		@apply grid gap-x-6 sm:grid-cols-2;
	}
	.items a,
	.items .plain {
		@apply flex min-h-12 items-center rounded-xl px-3 text-lg font-bold;
	}
	.items a {
		@apply transition-colors hover:bg-midground focus-visible:bg-midground;
	}
	.note {
		@apply text-sm text-text-muted md:col-start-2;
	}
</style>
