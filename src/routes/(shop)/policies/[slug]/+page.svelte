<script lang="ts">
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} · {strings.brand}</title>
</svelte:head>

<!-- The policy texts arrive in step 10, checked by the client. Nothing is invented here. -->
<PageHead title={data.title} lead={strings.policies.soon} />
