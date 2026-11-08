<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PackageIcon from '@lucide/svelte/icons/package';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import FileUpIcon from '@lucide/svelte/icons/file-up';
	import UsersIcon from '@lucide/svelte/icons/users';
	import SchoolIcon from '@lucide/svelte/icons/school';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ArrowUpLeftIcon from '@lucide/svelte/icons/arrow-up-left';
	import { strings } from '#lib/store/strings.js';

	// The admin's frame: a rail on the left from tablet width, a scrolling bar on top on phones.
	let { children }: { children: Snippet } = $props();
	const text = strings.admin.nav;

	const items = [
		{ href: resolve('/admin'), label: text.board, icon: LayoutGridIcon, exact: true },
		{ href: resolve('/admin/orders'), label: text.orders, icon: ReceiptIcon, exact: false },
		{ href: resolve('/admin/shipping'), label: text.shipping, icon: TruckIcon, exact: false },
		{ href: resolve('/admin/products'), label: text.products, icon: PackageIcon, exact: false },
		{ href: resolve('/admin/products/import'), label: text.import, icon: FileUpIcon, exact: true },
		{ href: resolve('/admin/schools'), label: text.schools, icon: SchoolIcon, exact: false },
		{ href: resolve('/admin/users'), label: text.users, icon: UsersIcon, exact: false },
		{ href: resolve('/admin/settings'), label: text.settings, icon: SettingsIcon, exact: false }
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
	<aside class="sidebar">
		<a class="brand" href={resolve('/admin')}>
			{strings.brand} <span class="badge">{strings.admin.badge}</span>
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

	/* The rail is an ink chapter: a column on the left from tablet width, a scrolling bar on top
	   on phones. The page itself stays paper. */
	div.shell {
		@apply flex min-h-dvh flex-col gap-3 p-2 md:flex-row md:p-3;

		aside.sidebar {
			@apply sticky top-2 z-20 flex shrink-0 items-center gap-2 overflow-x-auto rounded-[1.75rem] chapter-ink p-2;
			@apply md:top-3 md:h-[calc(100dvh-1.5rem)] md:w-60 md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:p-4;
			scrollbar-width: none;

			a.brand {
				@apply flex shrink-0 items-baseline gap-2 px-2 font-display text-lg font-extrabold tracking-tight whitespace-nowrap md:pb-6 md:text-2xl;

				span.badge {
					@apply type-kicker text-accent;
				}
			}
			ul.nav {
				@apply flex gap-1 md:flex-col;
			}
			a.item {
				@apply flex min-h-11 shrink-0 items-center gap-3 rounded-full px-4 text-sm font-bold whitespace-nowrap text-text-muted;

				&:hover {
					@apply text-text;
				}
				&.active {
					@apply sunken text-text;
				}
				&.store {
					@apply md:mt-auto;
				}
			}
		}

		main.content {
			@apply mx-auto w-full max-w-6xl min-w-0 flex-1 p-2 md:p-6;
		}
	}
</style>
