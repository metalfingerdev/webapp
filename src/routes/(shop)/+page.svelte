<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import ShirtIcon from '@lucide/svelte/icons/shirt';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import BadgeIndianRupeeIcon from '@lucide/svelte/icons/badge-indian-rupee';
	import HandCoinsIcon from '@lucide/svelte/icons/hand-coins';
	import SchoolIcon from '@lucide/svelte/icons/school';
	import StoreIcon from '@lucide/svelte/icons/store';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Button from '#lib/ui/Button.svelte';
	import Media from '#lib/ui/Media.svelte';
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

	// The quick links under the masthead: schools, then each section and its sub-sections
	const quickLinks = $derived([
		{ label: strings.nav.schools, href: resolve('/(shop)/schools') },
		...data.categories.flatMap((category) => [
			{
				label: category.name,
				href: resolve('/(shop)/shop/[category]', { category: category.slug })
			},
			...category.children.map((child) => ({
				label: child.name,
				href: resolve('/(shop)/shop/[category]', { category: child.slug })
			}))
		])
	]);

	const promiseIcons = [ShieldCheckIcon, TruckIcon, BadgeIndianRupeeIcon, HandCoinsIcon];
	const stationery = $derived(data.categories.find((c) => c.slug === 'stationery'));
</script>

<svelte:head>
	<title>{text.title}</title>
	<meta name="description" content={strings.tagline} />
</svelte:head>

<!-- 1. Masthead: the headline, what the shop sells, and quick links -->
<header class="masthead">
	<p class="eyebrow">{text.facts(data.schools.length, session).slice(0, 2).join(' · ')}</p>
	<h1 class="title">
		{text.headlineLead} <span class="accent">{text.headlineAccent}</span>
	</h1>
	<p class="lead">{text.lead}</p>
	<div class="actions">
		<Button href="#schools" variant="primary" large>{text.findSchool}</Button>
		<Button href="#how" large>{text.howItWorks}</Button>
	</div>

	<ul class="features">
		<li>
			<a class="feature" href={resolve('/(shop)/schools')}>
				<Media slot="home-books" ratio="4 / 3" icon={BookOpenIcon} eager />
				<span class="caption">
					<strong>{text.inside.books.title}</strong>
					<span>{text.inside.books.text}</span>
				</span>
			</a>
		</li>
		<li>
			<a class="feature" href={resolve('/(shop)/schools')}>
				<Media slot="home-uniform" ratio="4 / 3" icon={ShirtIcon} />
				<span class="caption">
					<strong>{text.inside.uniform.title}</strong>
					<span>{text.inside.uniform.text}</span>
				</span>
			</a>
		</li>
		<li>
			<a
				class="feature"
				href={stationery
					? resolve('/(shop)/shop/[category]', { category: stationery.slug })
					: resolve('/(shop)/shop')}
			>
				<Media slot="home-stationery" ratio="4 / 3" icon={PencilLineIcon} />
				<span class="caption">
					<strong>{text.inside.stationery.title}</strong>
					<span>{text.inside.stationery.text}</span>
				</span>
			</a>
		</li>
	</ul>

	<nav class="quick" aria-label={text.quickLinks}>
		{#each quickLinks as link (link.href)}
			<a href={link.href}>{link.label}</a>
		{/each}
	</nav>
</header>

<!-- 2. Schools: the ink chapter -->
<section class="schools" id="schools">
	<h2 class="title">{text.schoolsTitle}</h2>
	<p class="lead">{text.schoolsLead}</p>
	<ul class="cards">
		{#each data.schools as school (school.slug)}
			<li class="school">
				<Media slot="school-cover" ratio="1 / 1" icon={SchoolIcon} />
				<strong>{school.name}</strong>
				<Button
					href={resolve('/(shop)/schools/[school]', { school: school.slug })}
					variant="accent"
				>
					{text.buySet}
				</Button>
			</li>
		{/each}
	</ul>
	<a class="more" href={resolve('/(shop)/schools')}>
		{text.allSchools}
		<ArrowRightIcon size={18} aria-hidden="true" />
	</a>
</section>

<!-- 3. How it works: three big numbers beside a photo -->
<section class="how" id="how">
	<div class="copy">
		<h2 class="title">
			{text.stepsTitle} <span class="accent">{text.stepsLead}</span>
		</h2>
		<ol class="steps">
			{#each text.steps as step, i (step.title)}
				<li>
					<span class="number">{String(i + 1).padStart(2, '0')}</span>
					<span class="step-text">
						<strong>{step.title}</strong>
						<span>{step.text}</span>
					</span>
				</li>
			{/each}
		</ol>
	</div>
	<Media slot="home-how" ratio="3 / 4" />
</section>

<!-- 4. Books beyond the school list: the wine chapter -->
{#if data.categories.length}
	<section class="categories">
		<h2 class="title">{text.categoriesTitle}</h2>
		<p class="lead">{text.categoriesLead}</p>
		<ul class="cards">
			{#each data.categories as category (category.slug)}
				<li>
					<a
						class="category"
						href={resolve('/(shop)/shop/[category]', { category: category.slug })}
					>
						<strong>{category.name}</strong>
						{#if category.children.length}
							<span>{category.children.map((child) => child.name).join(' · ')}</span>
						{/if}
						<ArrowRightIcon size={20} aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- 5. Promises: raised tiles on the page -->
<section class="promises">
	<h2 class="title">{text.promisesTitle}</h2>
	<ul class="tiles">
		{#each text.promises as promise, i (promise.title)}
			{@const Icon = promiseIcons[i]}
			<li>
				<span class="badge"><Icon size={22} aria-hidden="true" /></span>
				<strong>{promise.title}</strong>
				<span>{promise.text}</span>
			</li>
		{/each}
	</ul>
</section>

<!-- 6. Closing: the saffron chapter, with a photo of the shop -->
<section class="closing">
	<div class="copy">
		<h2 class="title">{text.closingTitle}</h2>
		<p class="lead">{text.closingText}</p>
		<div class="actions">
			<Button href="#schools" variant="primary" large>{text.findSchool}</Button>
			<Button href={resolve('/(shop)/shop')} large>{text.shopAll}</Button>
		</div>
		{#if contactLines.length}
			<dl class="contact" aria-label={text.contactTitle}>
				{#each contactLines as [label, value] (label)}
					<div>
						<dt>{label}</dt>
						<dd>{value}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</div>
	<Media slot="shop-front" ratio="4 / 3" icon={StoreIcon} />
</section>

<style lang="postcss">
	@reference 'src/app.css';

	/* 1 */
	header.masthead {
		@apply flex flex-col gap-5 pt-4 pb-12;

		p.eyebrow {
			@apply type-kicker;
		}
		h1.title {
			@apply max-w-4xl type-display;
		}
		p.lead {
			@apply max-w-2xl text-lg text-text-muted;
		}
		div.actions {
			@apply flex flex-wrap gap-3;
		}
		ul.features {
			@apply mt-6 rail sm:auto-cols-[minmax(16rem,1fr)];
		}
		a.feature {
			@apply flex h-full press flex-col gap-3 rounded-[1.75rem] raised p-3;

			span.caption {
				@apply flex flex-col gap-0.5 px-2 pb-2;
			}
			strong {
				@apply type-title;
			}
			span.caption > span {
				@apply text-sm text-text-muted;
			}
		}
		nav.quick {
			@apply -mx-3 flex gap-2 overflow-x-auto px-3 pb-2;
			scrollbar-width: none;

			a {
				@apply inline-flex min-h-11 shrink-0 press items-center rounded-full raised px-4 text-sm font-bold whitespace-nowrap;
			}
		}
	}

	/* The coloured second line of a headline */
	span.accent {
		@apply text-accent;

		h2 & {
			@apply block;
		}
	}

	/* Section titles across the page */
	section :is(h2.title) {
		@apply type-headline;
	}
	section p.lead {
		@apply max-w-2xl text-text-muted;
	}

	/* 2 */
	section.schools {
		@apply flex scroll-mt-24 flex-col gap-4 chapter chapter-ink;

		ul.cards {
			@apply mt-4 rail;
		}
		li.school {
			@apply flex flex-col gap-4 rounded-[1.75rem] raised p-3;

			strong {
				@apply min-h-12 px-1 type-title;
			}
		}
		a.more {
			@apply inline-flex min-h-11 items-center gap-2 self-start font-bold text-accent;
		}
	}

	/* 3 */
	section.how {
		@apply grid scroll-mt-24 items-center gap-8 py-16 md:grid-cols-[3fr_2fr];

		div.copy {
			@apply flex flex-col gap-6;
		}
		ol.steps {
			@apply flex flex-col gap-4;

			li {
				@apply flex items-start gap-4 rounded-[1.75rem] raised p-5;
			}
			span.number {
				@apply font-display text-4xl leading-none font-semibold tracking-tight text-accent;
			}
			span.step-text {
				@apply flex flex-col gap-1;

				strong {
					@apply type-title text-lg;
				}
				span {
					@apply text-sm text-text-muted;
				}
			}
		}
	}

	/* 4 */
	section.categories {
		@apply flex flex-col gap-4 chapter chapter-wine;

		ul.cards {
			@apply mt-4 rail sm:auto-cols-[20rem];
		}
		a.category {
			@apply flex h-full min-h-40 press flex-col justify-between gap-3 rounded-[1.75rem] raised p-5;

			strong {
				@apply type-title text-2xl;
			}
			span {
				@apply text-sm text-text-muted;
			}
			:global(svg) {
				@apply self-end text-accent;
			}
		}
	}

	/* 5 */
	section.promises {
		@apply flex flex-col gap-6 py-16;

		ul.tiles {
			@apply grid grid-cols-2 gap-4 lg:grid-cols-4;

			li {
				@apply flex flex-col gap-2 rounded-[1.75rem] raised p-5;
			}
			span.badge {
				@apply mb-2 grid size-12 place-items-center rounded-full sunken text-accent;
			}
			strong {
				@apply type-title text-lg;
			}
			li > span:last-child {
				@apply text-sm text-text-muted;
			}
		}
	}

	/* 6 */
	section.closing {
		@apply grid items-center gap-8 chapter chapter-saffron md:grid-cols-[3fr_2fr];

		div.copy {
			@apply flex flex-col gap-4;
		}
		div.actions {
			@apply flex flex-wrap gap-3;
		}
		dl.contact {
			@apply mt-4 grid gap-3 rounded-[1.75rem] sunken p-5 sm:grid-cols-2;

			dt {
				@apply type-kicker;
			}
			dd {
				@apply font-bold wrap-break-word;
			}
		}
	}
</style>
