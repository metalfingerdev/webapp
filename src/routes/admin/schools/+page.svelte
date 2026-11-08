<script lang="ts">
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { gotoApp } from '#lib/primitives/utils/navigation.js';
	import { errorText } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import PlusIcon from '@lucide/svelte/icons/plus';

	const text = strings.admin.schools;
	const client = useConvexClient();
	const result = useQuery(api.store.admin.schools.list, {});

	let open = $state(false);
	let name = $state('');
	let error = $state('');
	let busy = $state(false);

	const run = async (action: () => Promise<unknown>) => {
		busy = true;
		error = '';
		try {
			await action();
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	const create = (event: SubmitEvent) => {
		event.preventDefault();
		return run(async () => {
			const id = await client.mutation(api.store.admin.schools.create, { name });
			open = false;
			name = '';
			await gotoApp(resolve('/admin/schools/[id]', { id }));
		});
	};

	const move = (schoolId: Id<'schools'>, direction: 'up' | 'down') =>
		run(() => client.mutation(api.store.admin.schools.move, { schoolId, direction }));
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<header class="head">
	<h1>{text.title}</h1>
	<Button
		variant="primary"
		onclick={() => {
			error = '';
			open = true;
		}}
	>
		<PlusIcon size={18} aria-hidden="true" />
		{text.add}
	</Button>
</header>

{#if error && !open}<Notice tone="bad" role="alert">{error}</Notice>{/if}

{#if result.isLoading}
	<ul class="list" aria-busy="true">
		{#each { length: 6 }, i (i)}<li class="bone h-16 rounded-xl"></li>{/each}
	</ul>
{:else if !result.data || result.data.schools.length === 0}
	<p class="empty">{text.empty}</p>
{:else}
	{@const { schools, session } = result.data}
	<ul class="list">
		{#each schools as school, i (school._id)}
			<li class="row">
				<a class="main" href={resolve('/admin/schools/[id]', { id: school._id })}>
					<span class="name">{school.name}</span>
					<span class="meta">{text.sets(school.liveSets, school.sets, session)}</span>
				</a>
				{#if school.isActive}<Pill tone="ok">{text.live}</Pill>{:else}<Pill>{text.hidden}</Pill
					>{/if}
				<Button
					icon
					aria-label={text.up}
					disabled={busy || i === 0}
					onclick={() => move(school._id, 'up')}
				>
					<ArrowUpIcon size={18} aria-hidden="true" />
				</Button>
				<Button
					icon
					aria-label={text.down}
					disabled={busy || i === schools.length - 1}
					onclick={() => move(school._id, 'down')}
				>
					<ArrowDownIcon size={18} aria-hidden="true" />
				</Button>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open title={text.addTitle} closeLabel={text.close}>
	<form class="flex flex-col gap-4" onsubmit={create}>
		<Field label={text.name} hint={text.newHint}>
			<input bind:value={name} required maxlength="80" />
		</Field>
		{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
		<Button type="submit" variant="primary" disabled={busy}>{text.create}</Button>
	</form>
</Modal>

<style lang="postcss">
	@reference 'src/app.css';

	.head {
		@apply mb-4 flex flex-wrap items-center justify-between gap-3;

		h1 {
			@apply text-2xl font-extrabold;
		}
	}
	.list {
		@apply flex flex-col gap-2;
	}
	.row {
		@apply flex items-center gap-2 rounded-xl raised p-2;
	}
	.main {
		@apply flex min-h-12 min-w-0 flex-1 flex-col justify-center px-2;
	}
	.name {
		@apply truncate font-bold;
	}
	.meta {
		@apply truncate text-xs text-text-muted;
	}
	.empty {
		@apply py-10 text-center text-text-muted;
	}
</style>
