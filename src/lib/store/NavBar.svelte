<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
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

	// Desktop and phone are separate UIs: the triggers and the box below exist from lg up; on a phone
	// the menu button opens the sheet instead. One thing is open at a time: a panel, the search, or none.
	let active = $state<number | null>(null);
	let searchOpen = $state(false);
	let menuOpen = $state(false);
	// The bar, the box and the search results: what counts as "inside" for hover and taps
	let header = $state<HTMLElement>();
	let triggerEls = $state<HTMLElement[]>([]);
	// Where the box points: the middle of the active trigger, from the bar's left edge (the bar is
	// the triggers' offset parent)
	let centre = $state(0);
	// True for the first frame of opening from closed, so the box appears in place instead of gliding
	let snap = $state(false);
	const open = $derived(active !== null || searchOpen);

	const show = (index: number) => {
		const el = triggerEls[index];
		snap = active === null;
		centre = el.offsetLeft + el.offsetWidth / 2;
		active = index;
		searchOpen = false;
		if (snap) requestAnimationFrame(() => requestAnimationFrame(() => (snap = false)));
	};
	const dismiss = () => {
		active = null;
		searchOpen = false;
	};
	const toggle = (index: number) => (active === index ? dismiss() : show(index));

	// A mouse opens a panel after a short pause (so brushing past a trigger does nothing) and closes it
	// a moment after leaving the bar. Touch and keyboard use the click.
	let openTimer: ReturnType<typeof setTimeout>;
	let closeTimer: ReturnType<typeof setTimeout>;
	const hover = (index: number, event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return;
		clearTimeout(closeTimer);
		clearTimeout(openTimer);
		if (active !== null) show(index);
		else openTimer = setTimeout(() => show(index), 120);
	};
	const leave = (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return;
		clearTimeout(openTimer);
		closeTimer = setTimeout(() => (active = null), 250);
	};

	const toggleSearch = () => {
		active = null;
		searchOpen = !searchOpen;
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
			if (header && !header.contains(event.target as Node)) dismiss();
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

<!-- Hover is a mouse shortcut only: every panel also opens by click, tap or Enter -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
	class="bar-wrap"
	bind:this={header}
	onpointerenter={() => clearTimeout(closeTimer)}
	onpointerleave={leave}
>
	<nav class="bar" aria-label="Main">
		<menu class="row">
			<li class="brand"><a href={resolve('/(shop)')}>{strings.brand}</a></li>

			{#each triggers as trigger, i (trigger.id)}
				<li class="wide">
					<button
						bind:this={triggerEls[i]}
						class="trigger"
						class:active={active === i}
						type="button"
						aria-expanded={active === i}
						aria-controls="mega-box"
						onclick={() => toggle(i)}
						onpointerenter={(event) => hover(i, event)}
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
					aria-label={searchOpen ? strings.nav.close : strings.nav.search}
					aria-expanded={searchOpen}
					aria-controls="search-panel"
					onclick={toggleSearch}
				>
					{#if searchOpen}
						<XIcon class="size-5" aria-hidden="true" />
					{:else}
						<SearchIcon class="size-5" aria-hidden="true" />
					{/if}
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
		{#if searchOpen}
			<SearchPanel {categories} onclose={dismiss} />
		{/if}
	</nav>

	<!-- All panels are stacked in one box, so it is as tall as the tallest and never resizes. Only its
	     position glides, to sit under the active trigger. Closed panels are inert (not focusable). -->
	<div class="box-wrap" class:open={active !== null} class:snap style="--centre: {centre}px">
		<div class="arrow" aria-hidden="true"></div>
		<div class="box" id="mega-box">
			{#each triggers as trigger, i (trigger.id)}
				<div
					class="slot"
					class:current={active === i}
					style="--side: {active === null ? 0 : Math.sign(i - active)}"
					inert={active !== i}
				>
					{#if i === 0}
						<MegaPanel {schools} />
					{:else}
						<MegaPanel category={categories[i - 1]} />
					{/if}
				</div>
			{/each}
		</div>
	</div>
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

	/* The old floating bar, softer: a rounded card with a light shadow and no hard edge. The panels
	   position against the header, which is the same width as the bar. */
	.bar-wrap {
		@apply sticky top-0 z-30 mx-auto max-w-6xl px-3 pt-3;
		container-type: inline-size;
	}
	.bar {
		@apply relative rounded-3xl border border-border-muted bg-foreground p-1.5 shadow-lg;
	}
	.row {
		@apply flex min-h-11 items-center gap-0.5;
	}
	.brand {
		@apply mr-2 flex-1 text-lg font-extrabold text-primary lg:flex-none;
	}
	.brand a {
		@apply flex min-h-11 items-center px-3;
	}
	.spacer {
		@apply hidden lg:block lg:flex-1;
	}
	.wide {
		@apply hidden lg:block;
	}
	.narrow {
		@apply lg:hidden;
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

	/* The sliding box, desktop only. Its position follows the active trigger; nothing else is measured. */
	.box-wrap {
		@apply pointer-events-none invisible absolute inset-x-3 top-full z-10 mt-2 -translate-y-2 opacity-0 max-lg:hidden;
		transition:
			opacity 200ms ease,
			translate 200ms ease,
			visibility 200ms;
	}
	.box-wrap.open {
		@apply pointer-events-auto visible translate-y-0 opacity-100;
	}
	.box {
		@apply relative grid w-[34rem] max-w-full rounded-3xl border border-border-muted bg-foreground shadow-lg;
		/* centred under the trigger, never past the bar's edges (100cqw is the bar's width) */
		transform: translateX(clamp(0px, calc(var(--centre) - 17rem), calc(100cqw - 34rem)));
		transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.arrow {
		@apply absolute -top-1.5 left-0 z-10 size-3 border-t border-l border-border-muted bg-foreground;
		transform: translateX(calc(var(--centre) - 6px)) rotate(45deg);
		transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.snap .box,
	.snap .arrow {
		transition: none;
	}
	/* Every panel sits in the same grid cell; the others wait to one side and fade out */
	.slot {
		@apply pointer-events-none invisible col-start-1 row-start-1 opacity-0;
		transform: translateX(calc(var(--side) * 48px));
		transition:
			opacity 200ms ease,
			transform 200ms ease,
			visibility 200ms;
	}
	.slot.current {
		@apply pointer-events-auto visible opacity-100;
		transform: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.box-wrap,
		.box,
		.arrow,
		.slot {
			transition: none;
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
