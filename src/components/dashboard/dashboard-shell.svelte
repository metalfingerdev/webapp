<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Package, School, ShoppingBag } from '@lucide/svelte';
	import type { DashTab } from '$lib/dashboard/dashboard.svelte.js';

	let { tab = $bindable('products' as DashTab), children }: { tab?: DashTab; children: Snippet } =
		$props();

	const nav: { id: DashTab; label: string; icon: typeof Package }[] = [
		{ id: 'products', label: 'Products', icon: Package },
		{ id: 'schools', label: 'Schools', icon: School },
		{ id: 'orders', label: 'Orders', icon: ShoppingBag }
	];
</script>

<div class="shell">
	<aside class="rail">
		<div class="brand">Aggarwalkart <span>Admin</span></div>
		<nav class="nav">
			{#each nav as item (item.id)}
				{@const Icon = item.icon}
				<button class="item" class:active={tab === item.id} onclick={() => (tab = item.id)}>
					<Icon size={16} />
					<span>{item.label}</span>
				</button>
			{/each}
		</nav>
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
		@apply flex shrink-0 gap-1 border-neutral-200 bg-white p-3;
		/* Mobile: a top bar. md+: a sticky left sidebar. */
		@apply overflow-x-auto border-b;
		@apply md:sticky md:top-0 md:h-dvh md:w-56 md:flex-col md:gap-1 md:border-r md:border-b-0 md:p-4 md:pt-20;
	}

	.brand {
		@apply hidden items-baseline gap-1 px-2 pb-4 text-lg font-semibold text-neutral-900 md:flex;

		span {
			@apply text-xs font-medium text-neutral-400 uppercase;
		}
	}

	.nav {
		@apply flex gap-1 md:flex-col;
	}

	.item {
		@apply inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 md:w-full;

		&.active {
			@apply bg-neutral-900 text-white hover:bg-neutral-900;
		}
	}

	.content {
		@apply flex-1 p-4 md:p-6 md:pt-20;
	}
</style>
