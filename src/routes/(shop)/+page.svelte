<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import ShirtIcon from '@lucide/svelte/icons/shirt';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import BadgeIndianRupeeIcon from '@lucide/svelte/icons/badge-indian-rupee';
	import HandCoinsIcon from '@lucide/svelte/icons/hand-coins';
	import Button from '#lib/ui/Button.svelte';
	import Card from '#lib/ui/Card.svelte';
	import { strings } from '#lib/store/strings.js';

	let { data } = $props();
	const text = strings.home;
	const contact = $derived(data.contact);
	const session = $derived(contact.currentSession);
	// Only what the owner has typed into the settings is shown
	const contactLines = $derived(
		[
			[text.contactPhone, contact.phone],
			[text.contactWhatsapp, contact.whatsapp],
			[text.contactEmail, contact.email],
			[text.contactAddress, contact.address]
		].filter((line): line is [string, string] => Boolean(line[1]))
	);

	// Two letters for a school's monogram: "Ryan International School" -> "RI"
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0]?.toUpperCase())
			.join('');

	const promiseIcons = [ShieldCheckIcon, TruckIcon, BadgeIndianRupeeIcon, HandCoinsIcon];
	const stationery = $derived(data.categories.find((c) => c.slug === 'stationery'));
</script>

<svelte:head>
	<title>{text.title}</title>
	<meta name="description" content={strings.tagline} />
</svelte:head>

<section class="hero">
	<h1 class="headline">{text.headline}</h1>
	<p class="lead">{text.lead}</p>
	<div class="actions">
		<Button href="#schools" variant="primary" large>{text.findSchool}</Button>
		<Button href="#how" large>{text.howItWorks}</Button>
	</div>
	<ul class="facts">
		{#each text.facts(data.schools.length, session) as fact (fact)}
			<li class="fact">{fact}</li>
		{/each}
	</ul>
</section>

<section class="block" id="schools">
	<h2 class="title">{text.schoolsTitle}</h2>
	<p class="lead">{text.schoolsLead}</p>
	<ul class="schools">
		{#each data.schools as school (school.slug)}
			<li class="school">
				<span class="monogram" aria-hidden="true">{initials(school.name)}</span>
				<strong class="school-name">{school.name}</strong>
				<Button href={resolve('/(shop)/schools/[school]', { school: school.slug })}>
					{text.buySet}
				</Button>
			</li>
		{/each}
	</ul>
	<a class="more" href={resolve('/(shop)/schools')}>{text.allSchools}</a>
</section>

<section class="block" id="how">
	<h2 class="title">{text.stepsTitle}</h2>
	<p class="lead">{text.stepsLead}</p>
	<ol class="steps">
		{#each text.steps as step, i (step.title)}
			<li>
				<Card>
					<span class="number">{String(i + 1).padStart(2, '0')}</span>
					<h3 class="card-title">{step.title}</h3>
					<p class="note">{step.text}</p>
				</Card>
			</li>
		{/each}
	</ol>
</section>

<section class="block">
	<h2 class="title">{text.insideTitle}</h2>
	<ul class="inside">
		<li>
			<Card as="a" pressable href={resolve('/(shop)/schools')}>
				<BookOpenIcon class="size-7 text-primary" aria-hidden="true" />
				<h3 class="card-title">{text.inside.books.title}</h3>
				<p class="note">{text.inside.books.text}</p>
			</Card>
		</li>
		<li>
			<Card as="a" pressable href={resolve('/(shop)/schools')}>
				<ShirtIcon class="size-7 text-primary" aria-hidden="true" />
				<h3 class="card-title">{text.inside.uniform.title}</h3>
				<p class="note">{text.inside.uniform.text}</p>
			</Card>
		</li>
		<li>
			<Card
				as="a"
				pressable
				href={stationery
					? resolve('/(shop)/shop/[category]', { category: stationery.slug })
					: resolve('/(shop)/shop')}
			>
				<PencilLineIcon class="size-7 text-primary" aria-hidden="true" />
				<h3 class="card-title">{text.inside.stationery.title}</h3>
				<p class="note">{text.inside.stationery.text}</p>
			</Card>
		</li>
	</ul>
</section>

{#if data.categories.length}
	<section class="block">
		<h2 class="title">{text.categoriesTitle}</h2>
		<p class="lead">{text.categoriesLead}</p>
		<ul class="categories">
			{#each data.categories as category (category.slug)}
				<li>
					<Card
						as="a"
						pressable
						href={resolve('/(shop)/shop/[category]', { category: category.slug })}
					>
						<h3 class="card-title">{category.name}</h3>
						{#if category.children.length}
							<p class="note">{category.children.map((child) => child.name).join(' · ')}</p>
						{/if}
					</Card>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<section class="block">
	<h2 class="title">{text.promisesTitle}</h2>
	<ul class="promises">
		{#each text.promises as promise, i (promise.title)}
			{@const Icon = promiseIcons[i]}
			<li class="promise">
				<span class="badge"><Icon class="size-5" aria-hidden="true" /></span>
				<span class="promise-text">
					<strong>{promise.title}</strong>
					<span class="note">{promise.text}</span>
				</span>
			</li>
		{/each}
	</ul>
</section>

<section class="closing">
	<h2 class="closing-title">{text.closingTitle}</h2>
	<p class="closing-text">{text.closingText}</p>
	<div class="actions">
		<Button href="#schools" large>{text.findSchool}</Button>
		<Button href={resolve('/(shop)/shop')} large>{text.shopAll}</Button>
	</div>
</section>

{#if contactLines.length}
	<section class="block">
		<h2 class="title">{text.contactTitle}</h2>
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
		@apply flex flex-col items-start gap-5 py-8 md:py-14;
	}
	.headline {
		@apply max-w-2xl text-4xl leading-tight font-extrabold md:text-6xl;
	}
	.lead {
		@apply max-w-xl text-lg text-text-muted;
	}
	.actions {
		@apply flex flex-wrap gap-3;
	}
	.facts {
		@apply flex flex-wrap gap-2;
	}
	.fact {
		@apply inline-flex min-h-9 items-center rounded-full raised px-4 text-sm font-bold;
	}

	.block {
		@apply flex scroll-mt-24 flex-col gap-3 py-8;
	}
	.title {
		@apply text-2xl font-extrabold md:text-3xl;
	}
	.card-title {
		@apply text-lg font-bold;
	}
	.note {
		@apply text-sm text-text-muted;
	}
	.more {
		@apply inline-flex min-h-11 items-center self-start font-bold text-primary;
	}

	/* Schools: a raised card each, with a monogram in a recess */
	.schools {
		@apply grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3;
	}
	.school {
		@apply flex flex-col items-start gap-3 rounded-xl raised p-4;
	}
	.monogram {
		@apply grid size-12 place-items-center rounded-full sunken text-lg font-extrabold text-primary;
	}
	.school-name {
		@apply text-lg leading-snug;
	}

	.steps {
		@apply grid gap-3 md:grid-cols-3;
	}
	.number {
		@apply mb-2 block text-3xl font-extrabold text-primary tabular-nums;
	}

	.inside {
		@apply grid gap-3 md:grid-cols-3;
	}
	.categories {
		@apply grid gap-3 sm:grid-cols-2 lg:grid-cols-3;
	}

	.promises {
		@apply grid gap-3 sm:grid-cols-2 lg:grid-cols-4;
	}
	.promise {
		@apply flex items-start gap-3 rounded-xl raised p-4;
	}
	.badge {
		@apply grid size-10 shrink-0 place-items-center rounded-full sunken text-primary;
	}
	.promise-text {
		@apply flex min-w-0 flex-col;
	}

	.closing {
		@apply my-8 flex flex-col items-start gap-3 rounded-3xl raised-primary p-6 text-foreground md:p-10;
	}
	.closing-title {
		@apply text-3xl font-extrabold md:text-4xl;
	}
	.closing-text {
		@apply max-w-xl text-lg opacity-90;
	}

	.contact {
		@apply grid gap-3 sm:grid-cols-2;
	}
</style>
