<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHead from '#lib/store/PageHead.svelte';
	import SeoHead from '#lib/store/SeoHead.svelte';
	import { strings } from '#lib/store/strings.js';
</script>

<SeoHead title={strings.policies.all} description={strings.seo.policies} />

<PageHead title={strings.policies.all} />

<ul class="policies">
	{#each strings.policies.list as policy (policy.slug)}
		<li>
			<a class="entry" href={resolve('/(shop)/policies/[slug]', { slug: policy.slug })}>
				{policy.title}
			</a>
		</li>
	{/each}
</ul>

<style lang="postcss">
	@reference 'src/app.css';

	ul.policies {
		@apply mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-16;

		a.entry {
			@apply block press rounded-2xl raised p-4 text-text;
		}
	}
</style>
