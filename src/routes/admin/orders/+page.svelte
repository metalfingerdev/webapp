<script lang="ts">
	import { usePaginatedQuery, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { OrderStatus } from '#convex/store/validators.js';
	import { useNow } from '#lib/store/admin/clock.svelte.js';
	import OrderCard from '#lib/store/admin/OrderCard.svelte';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Select from '#lib/ui/Select.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';

	const text = strings.admin.orders;
	const now = useNow();

	let status = $state('');
	let typed = $state('');
	let q = $state('');
	$effect(() => {
		const value = typed.trim();
		const timer = setTimeout(() => (q = value), 300);
		return () => clearTimeout(timer);
	});

	const statusOptions = [
		{ value: '', label: text.allStatuses },
		...(Object.keys(text.statuses) as OrderStatus[]).map((value) => ({
			value,
			label: text.statuses[value]
		}))
	];
	const listing = usePaginatedQuery(
		api.store.admin.orders.list,
		() => ({ status: status ? (status as OrderStatus) : undefined }),
		{ initialNumItems: 30 }
	);
	const found = useQuery(api.store.admin.orders.search, () => (q ? { q } : 'skip'));
	const rows = $derived(q ? (found.data ?? []) : listing.results);
	const loading = $derived(q ? found.isLoading : listing.isLoading);
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<PageHead title={text.title} size="headline" />

<div class="filters">
	<label class="search">
		<SearchIcon size={18} aria-hidden="true" />
		<span class="sr-only">{text.search}</span>
		<input type="search" bind:value={typed} placeholder={text.search} />
	</label>
	{#if !q}<Select label={text.status} bind:value={status} options={statusOptions} />{/if}
</div>
{#if q}<p class="hint">{text.searchHint}</p>{/if}

{#if loading && rows.length === 0}
	<ul class="list" aria-busy="true">
		{#each { length: 6 }, i (i)}<li class="bone"></li>{/each}
	</ul>
{:else if rows.length === 0}
	<p class="empty">{text.empty}</p>
{:else}
	<ul class="list">
		{#each rows as order (order._id)}
			<li><OrderCard {order} now={now.value} showStatus /></li>
		{/each}
	</ul>
	{#if !q && listing.status === 'CanLoadMore'}
		<div class="more">
			<Button onclick={() => listing.loadMore(30)}>{text.more}</Button>
		</div>
	{/if}
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	div.filters {
		@apply mb-2 grid gap-3 sm:grid-cols-[2fr_1fr];

		label.search {
			@apply flex min-h-11 items-center gap-2 rounded-full sunken px-4 text-text-muted;

			input {
				@apply min-w-0 flex-1 border-0 bg-transparent text-sm text-text outline-none focus:ring-0;
			}
		}
	}
	p.hint {
		@apply mb-2 text-xs text-text-muted;
	}
	ul.list {
		@apply mt-4 grid gap-4 md:grid-cols-2;

		li.bone {
			@apply h-24 rounded-3xl;
		}
	}
	p.empty {
		@apply py-10 text-center text-text-muted;
	}
	div.more {
		@apply mt-6 flex justify-center;
	}
</style>
