<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '#lib/ui/Card.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{strings.schools.title} · {strings.brand}</title>
</svelte:head>

<h1 class="title">{strings.schools.title}</h1>
<p class="lead">{strings.schools.lead}</p>
<ul class="grid">
	{#each data.schools as school (school.slug)}
		<li>
			<Card as="a" pressable href={resolve('/(shop)/schools/[school]', { school: school.slug })}
				>{school.name}</Card
			>
		</li>
	{/each}
</ul>

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply mb-2 text-3xl font-extrabold;
	}

	.lead {
		@apply mb-6 text-text-muted;
	}

	.grid {
		@apply grid gap-3 sm:grid-cols-2 lg:grid-cols-3;
	}
</style>
