<script lang="ts">
	import { resolve } from '$app/paths';
	import { useConvexClient, usePaginatedQuery, useQuery } from 'convex-svelte';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { api } from '#convex/_generated/api.js';
	import { exportCatalogue } from '#lib/store/admin/exportCsv.js';
	import ProductRow from '#lib/store/admin/ProductRow.svelte';
	import { errorText } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Select from '#lib/ui/Select.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';

	const text = strings.admin.products;
	const client = useConvexClient();

	let categoryId = $state('');
	// Select binds strings; the values are always one of the options below
	let status = $state('all');
	let stock = $state('any');
	let typed = $state('');
	let q = $state('');
	$effect(() => {
		const value = typed.trim();
		const timer = setTimeout(() => (q = value), 250);
		return () => clearTimeout(timer);
	});

	const options = useQuery(api.store.admin.products.options, {});
	const categoryOptions = $derived([
		{ value: '', label: text.allCategories },
		...(options.data?.categories ?? []).map((c) => ({ value: c._id, label: c.name }))
	]);
	const statusOptions = (['all', 'active', 'hidden'] as const).map((value) => ({
		value,
		label: text.statuses[value]
	}));
	const stockOptions = (['any', 'low', 'out'] as const).map((value) => ({
		value,
		label: text.stocks[value]
	}));

	const listing = usePaginatedQuery(
		api.store.admin.products.list,
		() => ({
			categoryId: categoryId ? (categoryId as Id<'categories'>) : undefined,
			status: status as 'all' | 'active' | 'hidden',
			stock: stock as 'any' | 'low' | 'out'
		}),
		{ initialNumItems: 30 }
	);
	const found = useQuery(api.store.admin.products.search, () => (q ? { q } : 'skip'));
	const rows = $derived(q ? (found.data ?? []) : listing.results);
	const loading = $derived(q ? found.isLoading : listing.isLoading);

	let exporting = $state(false);
	let error = $state('');
	const runExport = async () => {
		exporting = true;
		error = '';
		try {
			await exportCatalogue(client);
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			exporting = false;
		}
	};
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<PageHead title={text.title} size="headline">
	<Button onclick={runExport} disabled={exporting}>
		{exporting ? text.exporting : text.export}
	</Button>
	<Button href={resolve('/admin/products/import')}>{text.import}</Button>
	<Button variant="primary" href={resolve('/admin/products/new')}>
		<PlusIcon size={18} aria-hidden="true" />
		{text.add}
	</Button>
</PageHead>

<div class="products">
	{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}

	<div class="filters">
		<label class="search">
			<SearchIcon size={18} aria-hidden="true" />
			<span class="sr-only">{text.search}</span>
			<input type="search" bind:value={typed} placeholder={text.search} />
		</label>
		{#if !q}
			<Select label={text.category} bind:value={categoryId} options={categoryOptions} />
			<Select label={text.status} bind:value={status} options={statusOptions} />
			<Select label={text.stock} bind:value={stock} options={stockOptions} />
		{/if}
	</div>

	{#if loading && rows.length === 0}
		<ul class="list" aria-busy="true">
			{#each { length: 6 }, i (i)}<li class="bone"></li>{/each}
		</ul>
	{:else if rows.length === 0}
		<p class="empty">{text.empty}</p>
	{:else}
		<ul class="list">
			{#each rows as product (product._id)}
				<ProductRow {product} />
			{/each}
		</ul>
		{#if !q && listing.status === 'CanLoadMore'}
			<div class="more">
				<Button onclick={() => listing.loadMore(30)}>{text.more}</Button>
			</div>
		{/if}
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.products {
		@apply flex flex-col gap-4;

		div.filters {
			@apply grid gap-3 sm:grid-cols-2 lg:grid-cols-4;

			label.search {
				@apply flex min-h-11 items-center gap-2 rounded-full sunken px-4 text-text-muted sm:col-span-2 lg:col-span-1;

				input {
					@apply min-w-0 flex-1 border-0 bg-transparent text-sm text-text outline-none focus:ring-0;
				}
			}
		}
		ul.list {
			@apply flex flex-col gap-3;

			li.bone {
				@apply h-20 rounded-3xl;
			}
		}
		p.empty {
			@apply py-10 text-center text-text-muted;
		}
		div.more {
			@apply mt-4 flex justify-center;
		}
	}
</style>
