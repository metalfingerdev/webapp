<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Card from '#lib/ui/Card.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import { classRange } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const text = strings.schools;

	// The choice so far lives in the address (?for=uniform&gender=boys&type=regular), so Back works
	// and a link can be shared. Anything unknown is ignored.
	const pick = <T extends string>(name: string, allowed: readonly T[]) => {
		const value = page.url.searchParams.get(name);
		return allowed.find((option) => option === value) ?? null;
	};
	const kind = $derived(pick('for', ['books', 'uniform']));
	const gender = $derived(pick('gender', ['boys', 'girls']));
	const type = $derived(pick('type', ['regular', 'sports', 'winter']));

	const bookSets = $derived(data.sets.filter((set) => set.type === 'books'));
	const uniformSets = $derived(data.sets.filter((set) => set.type === 'uniform'));
	const forGender = (set: (typeof data.sets)[number], who: string) =>
		!set.gender || set.gender === 'unisex' || set.gender === who;
	const genders = $derived(
		(['boys', 'girls'] as const).filter((who) => uniformSets.some((set) => forGender(set, who)))
	);
	const types = $derived(
		(['regular', 'sports', 'winter'] as const).filter((kindOfUniform) =>
			uniformSets.some(
				(set) => set.uniformType === kindOfUniform && (!gender || forGender(set, gender))
			)
		)
	);

	const step = $derived(
		kind === null ? 1 : kind === 'books' ? 2 : gender === null ? 2 : type === null ? 3 : 4
	);
	const totalSteps = $derived(kind === 'books' ? 2 : 4);
	const classSets = $derived(
		kind === 'books'
			? bookSets
			: kind === 'uniform' && gender && type
				? uniformSets.filter((set) => set.uniformType === type && forGender(set, gender))
				: []
	);

	const base = $derived(resolve('/(shop)/schools/[school]', { school: data.school.slug }));
	const link = (query: Record<string, string>) => `${base}?${new URLSearchParams(query)}`;
	const back = $derived(
		kind === null
			? null
			: kind === 'books' || gender === null
				? base
				: type === null
					? link({ for: 'uniform' })
					: link({ for: 'uniform', gender })
	);
	const label: Record<string, string> = {
		boys: text.boys,
		girls: text.girls,
		regular: text.regular,
		sports: text.sports,
		winter: text.winter
	};
</script>

<svelte:head>
	<title>{data.school.name} · {strings.brand}</title>
</svelte:head>

<header class="head">
	<h1 class="title">{data.school.name}</h1>
	<Pill>{text.session(data.session)}</Pill>
</header>

{#if data.sets.length === 0}
	<p class="note">{text.none}</p>
{:else}
	<p class="progress">{text.stepOf(step, totalSteps)}</p>

	{#if kind === null}
		<h2 class="question">{text.whatFor}</h2>
		<ul class="choices">
			{#if bookSets.length}
				<li>
					<Card as="a" pressable href={link({ for: 'books' })}>
						<strong>{text.books}</strong>
						<span class="note">{text.booksHint}</span>
					</Card>
				</li>
			{/if}
			{#if uniformSets.length}
				<li>
					<Card as="a" pressable href={link({ for: 'uniform' })}>
						<strong>{text.uniform}</strong>
						<span class="note">{text.uniformHint}</span>
					</Card>
				</li>
			{/if}
		</ul>
	{:else if kind === 'uniform' && gender === null}
		<h2 class="question">{text.whoFor}</h2>
		<ul class="choices">
			{#each genders as who (who)}
				<li>
					<Card as="a" pressable href={link({ for: 'uniform', gender: who })}>
						<strong>{label[who]}</strong>
					</Card>
				</li>
			{/each}
		</ul>
	{:else if kind === 'uniform' && gender && type === null}
		<h2 class="question">{text.whichKind}</h2>
		<ul class="choices">
			{#each types as kindOfUniform (kindOfUniform)}
				<li>
					<Card as="a" pressable href={link({ for: 'uniform', gender, type: kindOfUniform })}>
						<strong>{label[kindOfUniform]}</strong>
					</Card>
				</li>
			{/each}
		</ul>
	{:else}
		<h2 class="question">{text.whichClass}</h2>
		{#if classSets.length === 0}
			<p class="note">{text.noneHere}</p>
		{:else}
			<ul class="choices">
				{#each classSets as set (set.id)}
					<li>
						<Card
							as="a"
							pressable
							href={resolve('/(shop)/schools/[school]/[set]', {
								school: data.school.slug,
								set: set.id
							})}
						>
							<strong>{set.label}</strong>
							<span class="note">{classRange(set.classFrom, set.classTo)}</span>
						</Card>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	{#if back}
		<nav class="nav">
			<a class="step-link" href={back}>{text.back}</a>
			<a class="step-link" href={base}>{text.start}</a>
		</nav>
	{/if}
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.head {
		@apply mb-4 flex flex-wrap items-center gap-3;
	}

	.title {
		@apply text-3xl font-extrabold;
	}

	.progress {
		@apply mb-1 text-sm font-bold text-text-muted;
	}

	.question {
		@apply mb-3 text-2xl font-extrabold;
	}

	.choices {
		@apply grid gap-3 sm:grid-cols-2;

		strong {
			@apply block text-lg;
		}
	}

	.note {
		@apply text-sm text-text-muted;
	}

	.nav {
		@apply mt-6 flex gap-4;
	}

	.step-link {
		@apply inline-flex min-h-11 items-center font-bold text-primary;
	}
</style>
