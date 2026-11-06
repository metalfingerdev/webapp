<script lang="ts">
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} · {strings.brand}</title>
</svelte:head>

<!-- The policy texts arrive in step 10, checked by the client. Nothing is invented here. -->
<h1 class="title">{data.title}</h1>
<p class="muted">{strings.policies.soon}</p>

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply mb-3 text-3xl font-extrabold;
	}
	.muted {
		@apply text-text-muted;
	}
</style>
