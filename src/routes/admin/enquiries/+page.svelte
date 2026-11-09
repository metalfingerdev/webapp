<script lang="ts">
	import { useConvexClient, usePaginatedQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Doc } from '#convex/_generated/dataModel.js';
	import type { EnquiryStatus } from '#convex/store/validators.js';
	import { errorText, formatDate, formatTime } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';

	// The Product On Demand inbox: one status at a time, newest first. Staff call the parent, then
	// mark the enquiry quoted or closed and leave a note.
	const text = strings.admin.enquiries;
	const client = useConvexClient();
	const statuses: EnquiryStatus[] = ['new', 'quoted', 'closed'];

	let status = $state<EnquiryStatus>('new');
	const listing = usePaginatedQuery(api.store.admin.enquiries.list, () => ({ status }), {
		initialNumItems: 30
	});

	let openId = $state<string | null>(null);
	let draftStatus = $state<EnquiryStatus>('new');
	let draftNote = $state('');
	let error = $state('');
	let busy = $state(false);

	const open = (row: Doc<'enquiries'>) => {
		openId = row._id;
		draftStatus = row.status;
		draftNote = row.note ?? '';
		error = '';
	};

	const save = async (row: Doc<'enquiries'>) => {
		busy = true;
		error = '';
		try {
			await client.mutation(api.store.admin.enquiries.update, {
				id: row._id,
				status: draftStatus,
				note: draftNote || undefined
			});
			openId = null;
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<PageHead title={text.title} lead={text.intro} size="headline" />

<div class="tabs" role="group" aria-label={text.statusLabel}>
	{#each statuses as value (value)}
		<Button variant={status === value ? 'primary' : 'plain'} onclick={() => (status = value)}>
			{text.status[value]}
		</Button>
	{/each}
</div>

{#if listing.isLoading && listing.results.length === 0}
	<ul class="list" aria-busy="true">
		{#each { length: 4 }, i (i)}<li class="bone"></li>{/each}
	</ul>
{:else if listing.results.length === 0}
	<p class="empty">{text.empty}</p>
{:else}
	<ul class="list">
		{#each listing.results as row (row._id)}
			<li class="item">
				<div class="top">
					<strong class="book">{row.bookName}</strong>
					<Pill>{row.number}</Pill>
				</div>
				<p class="meta">
					{row.name} ·
					<a href="tel:{row.phone}">{row.phone}</a>
					· {formatDate(row.createdAt)}, {formatTime(row.createdAt)}
				</p>
				{#if openId === row._id}
					<dl class="details">
						{#if row.author}<dt>{text.author}</dt>
							<dd>{row.author}</dd>{/if}
						{#if row.classLevel}<dt>{text.classLevel}</dt>
							<dd>{row.classLevel}</dd>{/if}
						<dt>{text.email}</dt>
						<dd><a href="mailto:{row.email}">{row.email}</a></dd>
					</dl>
					<label class="field">
						<span>{text.statusLabel}</span>
						<select bind:value={draftStatus}>
							{#each statuses as value (value)}
								<option {value}>{text.status[value]}</option>
							{/each}
						</select>
					</label>
					<label class="field">
						<span>{text.note}</span>
						<textarea bind:value={draftNote} maxlength="1000" placeholder={text.notePlaceholder}
						></textarea>
					</label>
					{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
					<div class="actions">
						<Button variant="primary" disabled={busy} onclick={() => save(row)}>{text.save}</Button>
						<Button onclick={() => (openId = null)}>{text.close}</Button>
					</div>
				{:else}
					{#if row.note}<p class="note">{row.note}</p>{/if}
					<div><Button onclick={() => open(row)}>{text.open}</Button></div>
				{/if}
			</li>
		{/each}
	</ul>
	{#if listing.status === 'CanLoadMore'}
		<div class="more"><Button onclick={() => listing.loadMore(30)}>{text.more}</Button></div>
	{/if}
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	div.tabs {
		@apply mb-2 flex flex-wrap gap-2;
	}
	ul.list {
		@apply mt-4 grid gap-4 md:grid-cols-2;

		li.bone {
			@apply h-28 rounded-3xl;
		}
		li.item {
			@apply flex flex-col items-start gap-3 rounded-[1.75rem] raised p-4;

			div.top {
				@apply flex w-full items-start justify-between gap-3;
			}
			strong.book {
				@apply type-title;
			}
			p.meta {
				@apply text-sm text-text-muted;

				a {
					@apply font-semibold text-text;
				}
			}
			p.note {
				@apply text-sm;
			}
			dl.details {
				@apply grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm;

				dt {
					@apply text-text-muted;
				}
			}
			label.field {
				@apply flex w-full flex-col gap-1.5 text-sm font-bold;

				:is(select, textarea) {
					@apply min-h-11 w-full rounded-xl border-0 sunken px-4 py-2 font-normal text-text;
				}
				textarea {
					@apply min-h-24;
				}
			}
			div.actions {
				@apply flex flex-wrap gap-2;
			}
		}
	}
	p.empty {
		@apply py-10 text-center text-text-muted;
	}
	div.more {
		@apply mt-6 flex justify-center;
	}
</style>
