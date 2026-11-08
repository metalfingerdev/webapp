<script lang="ts">
	import { resolve } from '$app/paths';
	import { useQuery } from 'convex-svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import { api } from '#convex/_generated/api.js';
	import { classRange } from './format.js';
	import { forGender } from './schoolSets.js';
	import { strings } from './strings.js';

	// A school inside the menu: book set or uniform, then the class. A shortcut only: the school page
	// has the same steps as links, for sharing and for search engines.
	let { slug, name }: { slug: string; name: string } = $props();
	const text = strings.schools;

	const result = useQuery(api.store.sets.listForSchool, () => ({ schoolSlug: slug }));
	const sets = $derived(result.data?.sets ?? []);
	const bookSets = $derived(sets.filter((set) => set.type === 'books'));
	const uniformSets = $derived(sets.filter((set) => set.type === 'uniform'));

	let kind = $state<'books' | 'uniform'>('books');
	let gender = $state<'boys' | 'girls'>('boys');
	let type = $state<'regular' | 'sports' | 'winter'>('regular');

	// Open on what the school has, and keep each choice to one that exists
	$effect(() => {
		if (result.data && !bookSets.length && uniformSets.length) kind = 'uniform';
	});
	const genders = $derived(
		(['boys', 'girls'] as const).filter((who) => uniformSets.some((set) => forGender(set, who)))
	);
	const types = $derived(
		(['regular', 'sports', 'winter'] as const).filter((t) =>
			uniformSets.some((set) => set.uniformType === t && forGender(set, gender))
		)
	);
	$effect(() => {
		if (genders.length && !genders.includes(gender)) gender = genders[0];
	});
	$effect(() => {
		if (types.length && !types.includes(type)) type = types[0];
	});

	const shown = $derived(
		kind === 'books'
			? bookSets
			: uniformSets.filter((set) => set.uniformType === type && forGender(set, gender))
	);
	const label = {
		boys: text.boys,
		girls: text.girls,
		regular: text.regular,
		sports: text.sports,
		winter: text.winter
	};
</script>

<div class="school">
	<header class="head">
		<h2 class="title">{name}</h2>
		{#if result.data}<Pill>{text.session(result.data.session)}</Pill>{/if}
	</header>

	{#if result.isLoading}
		<div class="grid" aria-label={strings.menu.loading}>
			{#each { length: 6 }, i (i)}<span class="tile bone"></span>{/each}
		</div>
	{:else if sets.length === 0}
		<p class="note">{text.none}</p>
	{:else}
		{#if bookSets.length && uniformSets.length}
			<div class="tabs" role="group" aria-label={text.whatFor}>
				<button type="button" aria-pressed={kind === 'books'} onclick={() => (kind = 'books')}>
					{text.books}
				</button>
				<button type="button" aria-pressed={kind === 'uniform'} onclick={() => (kind = 'uniform')}>
					{text.uniform}
				</button>
			</div>
		{/if}

		{#if kind === 'uniform'}
			{#if genders.length > 1}
				<div class="chips" role="group" aria-label={text.whoFor}>
					{#each genders as who (who)}
						<button type="button" aria-pressed={gender === who} onclick={() => (gender = who)}>
							{label[who]}
						</button>
					{/each}
				</div>
			{/if}
			{#if types.length > 1}
				<div class="chips" role="group" aria-label={text.whichKind}>
					{#each types as t (t)}
						<button type="button" aria-pressed={type === t} onclick={() => (type = t)}>
							{label[t]}
						</button>
					{/each}
				</div>
			{/if}
		{/if}

		<p class="step">{text.whichClass}</p>
		{#if shown.length === 0}
			<p class="note">{text.noneHere}</p>
		{:else}
			<ul class="grid">
				{#each shown as set (set.id)}
					<li>
						<a
							class="tile"
							href={resolve('/(shop)/schools/[school]/[set]', { school: slug, set: set.id })}
						>
							<strong>{set.label}</strong>
							<span>{classRange(set.classFrom, set.classTo)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.school {
		@apply flex flex-col gap-4;
	}

	.head {
		@apply flex flex-col items-start gap-2;
	}

	.title {
		@apply text-3xl leading-tight font-extrabold;
	}

	.tabs {
		@apply grid grid-cols-2 gap-1 rounded-full sunken p-1;

		button {
			@apply min-h-11 rounded-full font-bold text-text-muted;

			&[aria-pressed='true'] {
				@apply raised text-text;
			}
		}
	}

	.chips {
		@apply flex flex-wrap gap-2;

		button {
			@apply min-h-11 rounded-full bg-midground px-4 font-bold;

			&[aria-pressed='true'] {
				@apply bg-primary text-foreground;
			}
		}
	}

	.step {
		@apply text-sm font-bold text-text-muted;
	}

	.grid {
		@apply grid grid-cols-2 gap-2;
	}

	.tile {
		@apply flex min-h-18 flex-col justify-center gap-0.5 rounded-2xl bg-midground px-4 py-3;

		strong {
			@apply font-extrabold;
		}

		span {
			@apply text-xs text-text-muted;
		}

		&:active {
			@apply bg-primary text-foreground;

			span {
				@apply text-foreground;
			}
		}
	}

	.note {
		@apply text-sm text-text-muted;
	}
</style>
