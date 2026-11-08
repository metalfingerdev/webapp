<script lang="ts">
	import { resolve } from '$app/paths';
	import Pill from '#lib/ui/Pill.svelte';
	import SetPicker from '#lib/store/SetPicker.svelte';
	import { classRange } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';

	import { rememberSet } from '#lib/store/recentSets.js';

	let { data } = $props();

	// For the menu's "Continue" card
	$effect(() => {
		rememberSet({
			schoolSlug: data.school.slug,
			schoolName: data.school.name,
			setId: data.set.id,
			label: data.set.label
		});
	});
</script>

<svelte:head>
	<title>{data.set.label} · {data.school.name} · {strings.brand}</title>
</svelte:head>

<a class="crumb" href={resolve('/(shop)/schools/[school]', { school: data.school.slug })}
	>{strings.schools.backToSchool(data.school.name)}</a
>
<header class="head">
	<h1 class="title">{data.set.label}</h1>
	<Pill>{strings.schools.session(data.session)}</Pill>
</header>
<p class="note">{classRange(data.set.classFrom, data.set.classTo)}</p>

<!-- Keyed by the set, so moving to another set starts from fresh ticks -->
{#key data.set.id}
	<SetPicker lines={data.lines} extras={data.extras} setId={data.set.id} />
{/key}

<style lang="postcss">
	@reference 'src/app.css';

	.crumb {
		@apply inline-flex min-h-11 items-center text-sm font-bold text-primary;
	}

	.head {
		@apply flex flex-wrap items-center gap-3;
	}

	.title {
		@apply text-3xl font-extrabold;
	}

	.note {
		@apply text-sm text-text-muted;
	}
</style>
