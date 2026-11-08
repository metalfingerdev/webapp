<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { strings } from './strings.js';

	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	// The Schools panel lists schools; every other panel is one top-level category
	let { category, schools }: { category?: Category; schools?: { name: string; slug: string }[] } =
		$props();
</script>

<div class="mega-panel">
	{#if category}
		<a class="lead" href={resolve('/(shop)/shop/[category]', { category: category.slug })}>
			<span>{strings.nav.viewAll(category.name)}</span>
			<ArrowRightIcon size={24} aria-hidden="true" />
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
			<ArrowRightIcon size={24} aria-hidden="true" />
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

	div.mega-panel {
		@apply grid gap-4 p-6;

		a.lead {
			@apply flex items-start justify-between gap-3 type-headline text-2xl;
		}
		ul.items {
			@apply grid gap-x-4 gap-y-1 sm:grid-cols-2;

			a {
				@apply flex min-h-12 items-center rounded-full px-4 text-lg font-bold transition-shadow;

				&:hover,
				&:focus-visible {
					@apply sunken;
				}
			}
		}
	}
</style>
