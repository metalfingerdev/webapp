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
		<a class="lead" href={resolve('/(shop)/schools')}>
			<span>{strings.nav.viewAll(strings.nav.schools)}</span>
			<ArrowRightIcon class="size-6" aria-hidden="true" />
		</a>
		<ul class="items">
			{#each schools as school (school.slug)}
				<li>
					<a href={resolve('/(shop)/schools/[school]', { school: school.slug })}>{school.name}</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.panel {
		@apply grid gap-3 p-6;
	}

	.lead {
		@apply flex items-start justify-between gap-3 text-2xl leading-tight font-extrabold;
	}

	.items {
		@apply grid gap-x-6 sm:grid-cols-2;

		a {
			@apply flex min-h-12 items-center rounded-xl px-3 text-lg font-bold transition-colors hover:bg-midground focus-visible:bg-midground;
		}
	}
</style>
