<script lang="ts">
	import ShopHeader from '#lib/store/ShopHeader.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{strings.home.title}</title>
	<meta name="description" content={strings.tagline} />
</svelte:head>

<ShopHeader initialData={data.initialData} />

<main class="home">
	<h1 class="title">{strings.home.title}</h1>
	<p>{strings.tagline}</p>
	<p class="muted">{strings.home.comingSoon}</p>
</main>

<style lang="postcss">
	@reference 'src/app.css';

	.home {
		@apply mx-auto flex max-w-2xl flex-col gap-3 px-4 py-10;
	}
	.title {
		@apply text-2xl font-bold;
	}
	.muted {
		@apply text-text-muted;
	}
</style>
