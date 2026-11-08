<script lang="ts">
	import { resolve } from '$app/paths';
	import SchoolIcon from '@lucide/svelte/icons/school';
	import Media from '#lib/ui/Media.svelte';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{strings.schools.title} · {strings.brand}</title>
</svelte:head>

<PageHead title={strings.schools.title} lead={strings.schools.lead} />
<ul class="schools">
	{#each data.schools as school (school.slug)}
		<li>
			<a class="school" href={resolve('/(shop)/schools/[school]', { school: school.slug })}>
				<Media slot="school-cover" ratio="4 / 3" icon={SchoolIcon} />
				<strong>{school.name}</strong>
			</a>
		</li>
	{/each}
</ul>

<style lang="postcss">
	@reference 'src/app.css';

	ul.schools {
		@apply grid gap-5 sm:grid-cols-2 lg:grid-cols-3;

		a.school {
			@apply flex h-full press flex-col gap-4 rounded-[1.75rem] raised p-3;

			strong {
				@apply px-2 pb-2 type-title;
			}
		}
	}
</style>
