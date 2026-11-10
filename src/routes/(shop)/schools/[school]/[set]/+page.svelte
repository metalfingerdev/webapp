<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHead from '#lib/store/PageHead.svelte';
	import SeoHead from '#lib/store/SeoHead.svelte';
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

<SeoHead
	title={`${data.set.label} · ${data.school.name}`}
	description={strings.seo.set(data.set.label, data.school.name, data.session)}
/>

<PageHead
	back={{
		href: resolve('/(shop)/schools/[school]', { school: data.school.slug }),
		label: strings.schools.backToSchool(data.school.name)
	}}
	kicker={strings.schools.session(data.session)}
	title={data.set.label}
	lead={classRange(data.set.classFrom, data.set.classTo)}
/>

<!-- Keyed by the set, so moving to another set starts from fresh ticks -->
{#key data.set.id}
	<SetPicker lines={data.lines} extras={data.extras} setId={data.set.id} />
{/key}
