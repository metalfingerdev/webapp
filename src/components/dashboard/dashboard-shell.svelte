<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import { Package, School, ShoppingBag, ArrowUpRight, type LucideProps } from '@lucide/svelte';
	import type { Tab } from '$lib/dashboard/dashboard.svelte.js';

	type Icon = Component<LucideProps>;

	let { tab = $bindable('products' as Tab), children }: { tab: Tab; children: Snippet } = $props();

	const nav: { id: Tab; label: string; icon: Icon }[] = [
		{ id: 'products', label: 'Products', icon: Package },
		{ id: 'schools', label: 'Schools', icon: School },
		{ id: 'orders', label: 'Orders', icon: ShoppingBag }
	];
</script>

<div class="shell">
	<aside class="rail">
		<a class="brand" href="/">
			Aggarwalkart <span>Admin</span>
		</a>
		<menu class="nav">
			{#each nav as item (item.id)}
				{@const Icon = item.icon}
				<button class="item" class:active={tab === item.id} onclick={() => (tab = item.id)}>
					<Icon size={16} />
					<span>{item.label}</span>
				</button>
			{/each}
		</menu>
		<a class="store" href="/"><span><ArrowUpRight size={16} /></span> Store</a>
	</aside>

	<main class="content">
		{@render children()}
	</main>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.shell {
		@apply flex min-h-dvh flex-col bg-neutral-50 md:flex-row;
	}

	.rail {
		/* Mobile: a sticky top bar (the shop navbar is hidden on /dashboard, so this
		   owns the top). md+: a sticky full-height left sidebar. */
		@apply sticky top-0 z-10 flex shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white/95 p-3 backdrop-blur;
		@apply md:top-0 md:h-dvh md:w-56 md:flex-col md:items-stretch md:gap-1 md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0 md:p-4;
	}

	.brand {
		@apply flex shrink-0 items-baseline gap-1 px-1 text-base font-semibold whitespace-nowrap text-neutral-900 md:pb-4 md:text-lg;

		span {
			@apply text-xs font-medium text-neutral-400 uppercase;
		}
	}

	.nav {
		@apply flex gap-1 md:mt-0 md:flex-col;
	}

	.item {
		@apply inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 md:w-full;

		&.active {
			@apply bg-neutral-900 text-white hover:bg-neutral-900;
		}
	}

	/* "Back to store" link — pinned to the bottom of the sidebar on desktop. */
	.store {
		@apply ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 md:ml-0;
	}

	.content {
		@apply flex-1 p-4 md:p-6;
	}
</style>
