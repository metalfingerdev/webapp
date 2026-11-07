<script lang="ts">
	import { resolve } from '$app/paths';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import UserIcon from '@lucide/svelte/icons/user';
	import { useIsAppAdmin } from '#lib/admin/api/admin.svelte.js';
	import { ADMIN_ROUTE } from '#lib/admin/utils/admin.constants.js';
	import Drawer from './Drawer.svelte';
	import MenuSchool from './MenuSchool.svelte';
	import { loadRecentSets, type RecentSet } from './recentSets.js';
	import { strings } from './strings.js';

	// The menu, on every screen size. Each choice slides in a new view; Back slides it away. Links close
	// the drawer because the bar closes it on every page change. (The old sidebar's history idea,
	// legacy/src/lib/sidebar/sidebar.svelte.ts.)
	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	let {
		open = $bindable(false),
		categories,
		schools,
		whatsapp
	}: {
		open?: boolean;
		categories: Category[];
		schools: { name: string; slug: string }[];
		whatsapp?: string;
	} = $props();

	const auth = useAuth();
	const admin = useIsAppAdmin();

	type View =
		| { kind: 'root' }
		| { kind: 'schools' }
		| { kind: 'school'; slug: string; name: string }
		| { kind: 'category'; category: Category };
	let stack = $state<View[]>([{ kind: 'root' }]);
	let direction = $state<'fwd' | 'back'>('fwd');
	let recent = $state<RecentSet[]>([]);
	const view = $derived(stack[stack.length - 1]);
	const previous = $derived(stack[stack.length - 2]);

	// Every opening starts at the top, with the sets remembered on this device
	$effect(() => {
		if (!open) return;
		stack = [{ kind: 'root' }];
		recent = loadRecentSets();
	});

	const go = (next: View) => {
		direction = 'fwd';
		stack = [...stack, next];
	};
	const back = () => {
		direction = 'back';
		stack = stack.slice(0, -1);
	};
	const titleOf = (v: View) =>
		v.kind === 'root'
			? strings.nav.menu
			: v.kind === 'schools'
				? strings.nav.schools
				: v.kind === 'school'
					? v.name
					: v.category.name;

	// wa.me wants the number in digits with the country code; a 10-digit number is Indian
	const whatsappLink = $derived.by(() => {
		const digits = whatsapp?.replace(/\D/g, '') ?? '';
		if (digits.length < 10) return null;
		return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
	});
	const helpPolicies = strings.policies.list.filter((p) =>
		['shipping-and-delivery', 'refund-and-return'].includes(p.slug)
	);
</script>

<Drawer bind:open title={titleOf(view)} closeLabel={strings.nav.close}>
	{#snippet head()}
		{#if previous}
			<button class="back" type="button" onclick={back}>
				<ChevronLeftIcon class="size-5" aria-hidden="true" />
				<span>{titleOf(previous)}</span>
			</button>
		{:else}
			<span class="brand">{strings.brand}</span>
		{/if}
	{/snippet}

	{#key stack.length}
		<div class="view {direction}">
			{#if view.kind === 'root'}
				{#each recent as set (set.setId)}
					<a
						class="continue"
						href={resolve('/(shop)/schools/[school]/[set]', {
							school: set.schoolSlug,
							set: set.setId
						})}
					>
						<span class="continue-text">
							<small>{strings.menu.continue}</small>
							<strong>{set.label}</strong>
							<span>{set.schoolName}</span>
						</span>
						<ArrowRightIcon class="size-5 shrink-0" aria-hidden="true" />
					</a>
				{/each}

				<ul class="big">
					<li>
						<button type="button" onclick={() => go({ kind: 'schools' })}>
							{strings.nav.schools}
							<ChevronRightIcon class="size-6" aria-hidden="true" />
						</button>
					</li>
					{#each categories as category (category.slug)}
						<li>
							<button type="button" onclick={() => go({ kind: 'category', category })}>
								{category.name}
								<ChevronRightIcon class="size-6" aria-hidden="true" />
							</button>
						</li>
					{/each}
					<li><a href={resolve('/(shop)/shop')}>{strings.nav.allProducts}</a></li>
				</ul>

				<section class="group">
					<h2>{strings.menu.help}</h2>
					<ul class="small">
						{#if whatsappLink}
							<li>
								<a href={whatsappLink} target="_blank" rel="noopener">
									<MessageCircleIcon class="size-5" aria-hidden="true" />
									{strings.menu.whatsapp}
								</a>
							</li>
						{/if}
						{#each helpPolicies as policy (policy.slug)}
							<li>
								<a href={resolve('/(shop)/policies/[slug]', { slug: policy.slug })}>
									{policy.title}
								</a>
							</li>
						{/each}
					</ul>
				</section>

				{#if auth.isAuthenticated}
					<ul class="small">
						<li>
							<a href={resolve('/account')}>
								<UserIcon class="size-5" aria-hidden="true" />
								{strings.nav.account}
							</a>
						</li>
						<li><a href={resolve('/(shop)/orders')}>{strings.nav.orders}</a></li>
						{#if admin.isAppAdmin}
							<li><a href={resolve(ADMIN_ROUTE)}>{strings.nav.dashboard}</a></li>
						{/if}
					</ul>
				{:else if !auth.isLoading}
					<a class="sign-in" href={resolve('/(auth)/signin')}>
						<strong>{strings.menu.signIn}</strong>
						<span>{strings.menu.signInHint}</span>
					</a>
				{/if}
			{:else if view.kind === 'schools'}
				<h2 class="title">{strings.nav.schools}</h2>
				<ul class="list">
					{#each schools as school (school.slug)}
						<li>
							<button
								type="button"
								onclick={() => go({ kind: 'school', slug: school.slug, name: school.name })}
							>
								{school.name}
								<ChevronRightIcon class="size-5" aria-hidden="true" />
							</button>
						</li>
					{/each}
				</ul>
				<a class="all" href={resolve('/(shop)/schools')}>{strings.home.allSchools}</a>
			{:else if view.kind === 'school'}
				<MenuSchool slug={view.slug} name={view.name} />
			{:else}
				{@const category = view.category}
				<h2 class="title">{category.name}</h2>
				<ul class="list">
					{#each category.children as child (child.slug)}
						<li>
							<a href={resolve('/(shop)/shop/[category]', { category: child.slug })}>
								{child.name}
								<ChevronRightIcon class="size-5" aria-hidden="true" />
							</a>
						</li>
					{/each}
				</ul>
				<a class="all" href={resolve('/(shop)/shop/[category]', { category: category.slug })}>
					{strings.nav.viewAll(category.name)}
				</a>
			{/if}
		</div>
	{/key}
</Drawer>

<style lang="postcss">
	@reference 'src/app.css';

	.brand {
		@apply px-3 text-lg font-extrabold text-primary;
	}

	.back {
		@apply flex min-h-11 max-w-full items-center gap-0.5 rounded-full pr-3 pl-1 font-semibold text-text-muted;

		span {
			@apply truncate;
		}
	}

	/* Each view slides in from the side it came from */
	.view {
		@apply flex flex-col gap-6 px-6 pt-1 pb-8;

		&.fwd {
			animation: view-fwd 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
		}

		&.back {
			animation: view-back 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
		}
	}

	@keyframes view-fwd {
		from {
			opacity: 0;
			transform: translateX(2.5rem);
		}
	}

	@keyframes view-back {
		from {
			opacity: 0;
			transform: translateX(-2.5rem);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.view.fwd,
		.view.back {
			animation: none;
		}
	}

	.continue {
		@apply flex items-center gap-3 rounded-3xl bg-primary-tint p-4 text-primary;
	}

	.continue-text {
		@apply flex min-w-0 flex-1 flex-col;

		small {
			@apply text-xs font-bold;
		}

		strong {
			@apply truncate text-lg font-extrabold text-text;
		}

		span {
			@apply truncate text-sm text-text-muted;
		}
	}

	.big {
		@apply flex flex-col;

		button,
		a {
			@apply flex min-h-14 w-full items-center justify-between text-3xl font-extrabold;
		}

		a {
			@apply text-xl text-text-muted;
		}
	}

	.group h2 {
		@apply mb-1 text-xs font-extrabold tracking-wide text-text-muted uppercase;
	}

	.small a {
		@apply flex min-h-11 items-center gap-3 font-semibold;
	}

	.sign-in {
		@apply flex flex-col gap-0.5 rounded-3xl bg-midground p-4;

		span {
			@apply text-sm text-text-muted;
		}
	}

	.title {
		@apply text-3xl font-extrabold;
	}

	.list {
		@apply flex flex-col;

		button,
		a {
			@apply flex min-h-13 w-full items-center justify-between gap-3 border-b border-border-muted text-left text-lg font-bold;
		}
	}

	.all {
		@apply inline-flex min-h-11 items-center font-bold text-primary;
	}
</style>
