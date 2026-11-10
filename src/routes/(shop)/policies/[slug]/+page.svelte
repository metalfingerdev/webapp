<script lang="ts">
	import PageHead from '#lib/store/PageHead.svelte';
	import SeoHead from '#lib/store/SeoHead.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const draft = $derived(data.text.sections.length === 0);
</script>

<SeoHead title={data.title} noindex={draft} />

<PageHead title={data.title} back={{ href: '/policies', label: strings.policies.all }} />

<article class="policy">
	{#if draft}
		<Notice tone="warn" role="status">{strings.policies.soon}</Notice>
	{:else}
		{#if data.text.updated}<p class="updated">{strings.policies.updated(data.text.updated)}</p>{/if}
		{#each data.text.sections as section, i (i)}
			<section class="part">
				{#if section.heading}<h2 class="subhead">{section.heading}</h2>{/if}
				{#each section.paragraphs as paragraph, j (j)}<p>{paragraph}</p>{/each}
			</section>
		{/each}
	{/if}
</article>

<style lang="postcss">
	@reference 'src/app.css';

	article.policy {
		@apply mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 text-text;

		p.updated {
			@apply text-sm text-text-muted;
		}
		section.part {
			@apply flex flex-col gap-3;
		}
		h2.subhead {
			@apply type-title;
		}
	}
</style>
