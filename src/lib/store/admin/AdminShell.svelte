<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PackageIcon from '@lucide/svelte/icons/package';
	import FileUpIcon from '@lucide/svelte/icons/file-up';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ArrowUpLeftIcon from '@lucide/svelte/icons/arrow-up-left';
	import { strings } from '#lib/store/strings.js';

	// The admin's frame: a rail on the left from tablet width, a scrolling bar on top on phones.
	// 7b to 7d add Schools, Orders, Shipping and Settings here.
	let { children }: { children: Snippet } = $props();
	const text = strings.admin.nav;

	const items = [
		{ href: resolve('/admin/products'), label: text.products, icon: PackageIcon, exact: false },
		{ href: resolve('/admin/products/import'), label: text.import, icon: FileUpIcon, exact: true },
		{ href: resolve('/admin/users'), label: text.users, icon: UsersIcon, exact: false }
	];
	const isActive = (href: string, exact: boolean) => {
		const path = page.url.pathname;
		if (exact) return path === href;
		// "Products" stays lit on a product page, but not on the import page (its own item)
		return (
			(path === href || path.startsWith(`${href}/`)) &&
			!items.some((item) => item.exact && path === item.href)
		);
	};
</script>

<div class="shell">
	<aside class="rail">
		<a class="brand" href={resolve('/admin')}>
			{strings.brand} <span>{strings.admin.badge}</span>
		</a>
		<nav aria-label={text.label}>
			<ul class="nav">
				{#each items as item (item.href)}
					{@const Icon = item.icon}
					<li>
						<a
							class="item"
							class:active={isActive(item.href, item.exact)}
							href={item.href}
							aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
						>
							<Icon size={18} aria-hidden="true" />
							<span>{item.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<a class="item store" href={resolve('/(shop)')}>
			<ArrowUpLeftIcon size={18} aria-hidden="true" />
			<span>{text.store}</span>
		</a>
	</aside>

	<main class="content">
		{@render children()}
	</main>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.shell {
		@apply flex min-h-dvh flex-col bg-background md:flex-row;
	}
	.rail {
		@apply sticky top-0 z-20 flex shrink-0 items-center gap-2 overflow-x-auto bg-midground p-2 shadow-s;
		@apply md:h-dvh md:w-56 md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:p-4;
	}
	.brand {
		@apply flex shrink-0 items-baseline gap-1.5 px-2 text-base font-extrabold whitespace-nowrap md:pb-4;

		span {
			@apply text-xs font-bold text-text-muted uppercase;
		}
	}
	.nav {
		@apply flex gap-1 md:flex-col;
	}
	.item {
		@apply flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold whitespace-nowrap text-text-muted;

		&.active {
			@apply raised text-text;
		}
	}
	.store {
		@apply md:mt-auto;
	}
	.content {
		@apply mx-auto w-full max-w-6xl min-w-0 flex-1 p-4 md:p-6;
	}
</style>
