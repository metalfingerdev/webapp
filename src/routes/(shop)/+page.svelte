<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/ui/Button.svelte';
	import Card from '#lib/ui/Card.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const contact = $derived(data.contact);
	// Only what the owner has typed into the settings is shown
	const contactLines = $derived(
		[
			[strings.home.contactPhone, contact.phone],
			[strings.home.contactWhatsapp, contact.whatsapp],
			[strings.home.contactEmail, contact.email],
			[strings.home.contactAddress, contact.address]
		].filter((line): line is [string, string] => Boolean(line[1]))
	);
</script>

<svelte:head>
	<title>{strings.home.title}</title>
	<meta name="description" content={strings.tagline} />
</svelte:head>

<section class="hero">
	<h1 class="headline">{strings.home.headline}</h1>
	<p class="lead">{strings.home.lead}</p>
	<Button href={resolve('/(shop)/shop')} variant="primary" large>{strings.home.shopAll}</Button>
</section>

<section class="block">
	<h2 class="title">{strings.home.schoolsTitle}</h2>
	<!-- Step 3 turns these tiles into links to each school's book and uniform sets -->
	<ul class="schools">
		{#each data.schools as school (school.slug)}
			<li><Card>{school.name}</Card></li>
		{/each}
	</ul>
	<p class="note">{strings.home.schoolsSoon}</p>
</section>

<section class="block">
	<h2 class="title">{strings.home.promisesTitle}</h2>
	<ul class="promises">
		{#each strings.home.promises as promise (promise.title)}
			<li>
				<Card>
					<h3 class="promise-title">{promise.title}</h3>
					<p class="note">{promise.text}</p>
				</Card>
			</li>
		{/each}
	</ul>
</section>

<section class="block care">
	<h2 class="title">{strings.home.careTitle}</h2>
	<p class="lead">{strings.home.careText}</p>
</section>

{#if contactLines.length}
	<section class="block">
		<h2 class="title">{strings.home.contactTitle}</h2>
		<dl class="contact">
			{#each contactLines as [label, value] (label)}
				<div>
					<dt class="note">{label}</dt>
					<dd class="font-bold">{value}</dd>
				</div>
			{/each}
		</dl>
	</section>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.hero {
		@apply flex flex-col items-start gap-4 py-8 md:py-14;
	}
	.headline {
		@apply max-w-2xl text-4xl leading-tight font-extrabold md:text-6xl;
	}
	.lead {
		@apply max-w-xl text-lg text-text-muted;
	}
	.block {
		@apply flex flex-col gap-3 py-8;
	}
	.title {
		@apply text-2xl font-extrabold md:text-3xl;
	}
	.schools {
		@apply grid gap-3 sm:grid-cols-2 lg:grid-cols-3;
	}
	.promises {
		@apply grid gap-3 md:grid-cols-3;
	}
	.promise-title {
		@apply text-lg font-bold;
	}
	.note {
		@apply text-sm text-text-muted;
	}
	.contact {
		@apply grid gap-3 sm:grid-cols-2;
	}
</style>
