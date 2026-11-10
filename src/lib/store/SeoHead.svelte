<script lang="ts">
	import { page } from '$app/state';
	import { strings } from '#lib/store/strings.js';

	// The head of a public shop page: title, description and the Open Graph tags that give a link
	// shared on WhatsApp a preview. The address comes from the request, so no domain is written here:
	// staging and the live site each name themselves.
	type Props = {
		/** The page's own title; the shop's name is added after it */
		title: string;
		description?: string;
		/** An absolute URL. A page without a photo gets no image tag (there is no logo yet). */
		image?: string | null;
		noindex?: boolean;
	};

	let { title, description, image, noindex = false }: Props = $props();

	const fullTitle = $derived(title === strings.brand ? title : `${title} · ${strings.brand}`);
	const url = $derived(page.url.origin + page.url.pathname);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	{#if description}<meta name="description" content={description} />{/if}
	{#if noindex}<meta name="robots" content="noindex" />{/if}
	<link rel="canonical" href={url} />
	<meta property="og:site_name" content={strings.brand} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="en_IN" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	{#if description}<meta property="og:description" content={description} />{/if}
	{#if image}
		<meta property="og:image" content={image} />
		<meta property="og:image:alt" content={title} />
	{/if}
	<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
</svelte:head>
