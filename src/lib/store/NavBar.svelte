<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { useIsAppAdmin } from '#lib/admin/api/admin.svelte.js';
	import { ADMIN_ROUTE } from '#lib/admin/utils/admin.constants.js';
	import UserButton from '#lib/users/ui/UserButton.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import MegaPanel from './MegaPanel.svelte';
	import SearchPanel from './SearchPanel.svelte';
	import { strings } from './strings.js';

	type Category = { name: string; slug: string; children: { name: string; slug: string }[] };
	let {
		categories,
		schools,
		initialData
	}: {
		categories: Category[];
		schools: { name: string; slug: string }[];
		initialData?: Parameters<typeof UserButton>[1]['initialData'];
	} = $props();

	const admin = useIsAppAdmin();

	// The row: Schools first, then each top-level category (Books, Uniforms, Stationery)
	const triggers = $derived([
		{ id: 'schools', label: strings.nav.schools },
		...categories.map((category) => ({ id: category.slug, label: category.name }))
	]);

	// One panel is open at a time: a mega panel (by index), the search panel, or none
	let active = $state<number | null>(null);
	let previous = $state<number | null>(null);
	let searchOpen = $state(false);
	let menuOpen = $state(false);
	let bar = $state<HTMLElement>();
	const open = $derived(active !== null || searchOpen);
	// Which way the new panel arrives from, so moving along the row feels like one surface
	const from = $derived(
		active === null || previous === null ? 'none' : active > previous ? 'right' : 'left'
	);

	const dismiss = () => {
		active = null;
		previous = null;
		searchOpen = false;
	};
	const toggle = (index: number) => {
		if (active === index) return dismiss();
		previous = active;
		active = index;
		searchOpen = false;
	};
	const toggleSearch = () => {
		if (searchOpen) return dismiss();
		active = null;
		previous = null;
		searchOpen = true;
	};

	// Close everything when the visitor moves to another page
	$effect(() => {
		void page.url.pathname;
		dismiss();
		menuOpen = false;
	});

	// A tap outside the bar, or Escape, closes the panel
	$effect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (bar && !bar.contains(event.target as Node)) dismiss();
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') dismiss();
		};
		window.addEventListener('pointerdown', onPointer);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('pointerdown', onPointer);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<header class="bar-wrap">
	<nav class="bar" aria-label="Main" bind:this={bar}>
		<menu class="row">
			<li class="brand"><a href={resolve('/(shop)')}>{strings.brand}</a></li>

			{#each triggers as trigger, i (trigger.id)}
				<li class="wide">
					<button
						class="trigger"
						class:active={active === i}
						type="button"
						aria-expanded={active === i}
						aria-controls="mega-panel"
						onclick={() => toggle(i)}
					>
						{trigger.label}
						<ChevronDownIcon class="caret size-4" aria-hidden="true" />
					</button>
				</li>
			{/each}
			{#if admin.isAppAdmin}
				<li class="wide">
					<a class="link" href={resolve(ADMIN_ROUTE)}>{strings.nav.dashboard}</a>
				</li>
			{/if}

			<li class="spacer" aria-hidden="true"></li>
			<li>
				<button
					class="action"
					class:active={searchOpen}
					type="button"
					aria-label={strings.nav.search}
					aria-expanded={searchOpen}
					aria-controls="mega-panel"
					onclick={toggleSearch}
				>
					<SearchIcon class="size-5" aria-hidden="true" />
				</button>
			</li>
			<li><UserButton {initialData} /></li>
			<li class="narrow">
				<button
					class="action"
					type="button"
					aria-label={strings.nav.menu}
					onclick={() => (menuOpen = true)}
				>
					<MenuIcon class="size-5" aria-hidden="true" />
				</button>
			</li>
		</menu>

		{#if open}
			<div class="drop" id="mega-panel" data-from={from}>
				{#if searchOpen}
					<SearchPanel {categories} onclose={dismiss} />
				{:else if active === 0}
					<MegaPanel {schools} />
				{:else if active !== null}
					<MegaPanel category={categories[active - 1]} />
				{/if}
			</div>
		{/if}
	</nav>
</header>

<!-- On a phone the row is too narrow for the triggers: the menu button opens this instead -->
<Sheet bind:open={menuOpen} title={strings.nav.menu} closeLabel={strings.nav.close}>
	<div class="sheet">
		<section>
			<h2 class="heading">{strings.nav.categories}</h2>
			<ul class="links">
				<li><a href={resolve('/(shop)/shop')}>{strings.nav.allProducts}</a></li>
				{#each categories as category (category.slug)}
					<li>
						<a
							class="strong"
							href={resolve('/(shop)/shop/[category]', { category: category.slug })}
						>
							{category.name}
						</a>
						{#if category.children.length}
							<ul class="sub">
								{#each category.children as child (child.slug)}
									<li>
										<a href={resolve('/(shop)/shop/[category]', { category: child.slug })}
											>{child.name}</a
										>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
		<section>
			<h2 class="heading">{strings.nav.schools}</h2>
			<!-- Step 3 turns these into links to each school's sets -->
			<ul class="links">
				{#each schools as school (school.slug)}<li class="plain">{school.name}</li>{/each}
			</ul>
			<p class="note">{strings.nav.schoolsSoon}</p>
		</section>
		{#if admin.isAppAdmin}
			<a class="strong" href={resolve(ADMIN_ROUTE)}>{strings.nav.dashboard}</a>
		{/if}
		<a class="strong" href={resolve('/account')}>{strings.nav.account}</a>
	</div>
</Sheet>

<style lang="postcss">
	@reference 'src/app.css';

	.bar-wrap {
		@apply sticky top-0 z-30 px-3 pt-3;
	}
	/* The old floating bar, softer: a rounded card on the page with a light shadow and no hard edge */
	.bar {
		@apply relative mx-auto max-w-6xl rounded-3xl border border-border-muted bg-foreground p-1.5 shadow-lg;
	}
	.row {
		@apply flex min-h-12 items-center gap-0.5;
	}
	.brand {
		@apply mr-2 text-lg font-extrabold text-primary;
	}
	.brand a {
		@apply flex min-h-11 items-center px-3;
	}
	.spacer {
		@apply flex-1;
	}
	.wide {
		@apply hidden lg:block;
	}
	.narrow {
		@apply lg:hidden;
	}
	.brand {
		@apply max-lg:flex-1;
	}
	.trigger,
	.link {
		@apply inline-flex min-h-11 items-center gap-1.5 squircle-4xl px-4 font-bold transition-colors;
	}
	.trigger :global(.caret) {
		@apply transition-transform;
	}
	.trigger:hover,
	.trigger.active,
	.link:hover,
	.action:hover,
	.action.active {
		@apply bg-midground;
	}
	.trigger.active :global(.caret) {
		@apply rotate-180;
	}
	.action {
		@apply grid size-11 place-items-center rounded-full transition-colors;
	}

	/* The panel drops from the bar. It is mounted only while open. */
	.drop {
		@apply absolute inset-x-0 top-full mt-2 max-h-[80dvh] overflow-y-auto rounded-3xl border border-border-muted bg-foreground shadow-lg;
		animation: drop-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.drop[data-from='right'] {
		animation-name: drop-from-right;
	}
	.drop[data-from='left'] {
		animation-name: drop-from-left;
	}
	@keyframes drop-in {
		from {
			opacity: 0;
			translate: 0 -8px;
		}
	}
	@keyframes drop-from-right {
		from {
			opacity: 0;
			translate: 48px 0;
		}
	}
	@keyframes drop-from-left {
		from {
			opacity: 0;
			translate: -48px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drop {
			animation: none;
		}
	}

	.sheet {
		@apply grid gap-5;
	}
	.heading {
		@apply mb-1 text-xs font-extrabold tracking-wide text-text-muted uppercase;
	}
	.links {
		@apply flex flex-col;
	}
	.links a,
	.links .plain {
		@apply flex min-h-11 items-center;
	}
	.strong {
		@apply flex min-h-11 items-center font-bold;
	}
	.sub {
		@apply mb-1 ml-3 flex flex-col border-l-2 border-border-muted pl-3 text-sm;
	}
	.note {
		@apply text-sm text-text-muted;
	}
</style>
