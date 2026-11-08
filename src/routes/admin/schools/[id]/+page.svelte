<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { gotoApp } from '#lib/primitives/utils/navigation.js';
	import SetFields from '#lib/store/admin/SetFields.svelte';
	import { emptySet, toSetInput } from '#lib/store/admin/setForm.js';
	import { classRange, errorText } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Choice from '#lib/ui/Choice.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PlusIcon from '@lucide/svelte/icons/plus';

	const text = strings.admin.schools;
	const setText = strings.admin.sets;
	const client = useConvexClient();
	const schoolId = $derived(page.params.id as Id<'schools'>);

	const schoolResult = useQuery(api.store.admin.schools.get, () => ({ schoolId }));
	const school = $derived(schoolResult.data);
	const sessions = useQuery(api.store.admin.sets.sessions, {});

	// The session being edited: the current one unless the admin picks another
	let picked = $state<string | undefined>();
	const session = $derived(picked ?? sessions.data?.current);
	const next = $derived(sessions.data?.all[2]);
	const sets = useQuery(api.store.admin.sets.listForSchool, () =>
		session ? { schoolId, session } : 'skip'
	);

	let name = $state('');
	let nameFor = $state<string | undefined>();
	$effect(() => {
		if (school && nameFor !== school._id) {
			name = school.name;
			nameFor = school._id;
		}
	});

	let error = $state('');
	let notice = $state('');
	let busy = $state(false);
	const run = async (action: () => Promise<unknown>) => {
		busy = true;
		error = '';
		notice = '';
		try {
			await action();
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	const saveSchool = (isActive: boolean) =>
		run(() =>
			client.mutation(api.store.admin.schools.update, {
				schoolId,
				name,
				isActive
			})
		);

	let adding = $state(false);
	let form = $state(emptySet());
	let addError = $state('');
	const addSet = async (event: SubmitEvent) => {
		event.preventDefault();
		if (!session) return;
		addError = '';
		busy = true;
		try {
			const setId = await client.mutation(api.store.admin.sets.create, {
				schoolId,
				session,
				type: form.type,
				...toSetInput(form)
			});
			adding = false;
			await gotoApp(resolve('/admin/schools/[id]/sets/[setId]', { id: schoolId, setId }));
		} catch (e) {
			addError = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	let confirmCopy = $state(false);
	const copy = () =>
		run(async () => {
			if (!session || !next) return;
			const n = await client.mutation(api.store.admin.sets.copyToSession, {
				schoolId,
				from: session,
				to: next
			});
			confirmCopy = false;
			picked = next;
			notice = text.copied(n, next);
		});
</script>

<svelte:head>
	<title>{school?.name ?? text.title} · {strings.admin.title}</title>
</svelte:head>

<a class="back" href={resolve('/admin/schools')}>
	<ArrowLeftIcon size={18} aria-hidden="true" />
	{text.back}
</a>

{#if schoolResult.isLoading}
	<div class="flex justify-center py-16"><Spinner /></div>
{:else if !school}
	<Notice tone="warn" role="status">{text.notFound}</Notice>
{:else}
	<header class="head">
		<h1>{school.name}</h1>
		{#if school.isActive}<Pill tone="ok">{text.live}</Pill>{:else}<Pill>{text.hidden}</Pill>{/if}
	</header>

	<section class="panel p-4">
		<form
			class="name-form"
			onsubmit={(event) => {
				event.preventDefault();
				void saveSchool(school.isActive);
			}}
		>
			<Field label={text.name}><input bind:value={name} required maxlength="80" /></Field>
			<Button type="submit" disabled={busy || name === school.name}>{text.rename}</Button>
		</form>
		<div class="mt-3">
			{#if school.isActive}
				<Button disabled={busy} onclick={() => saveSchool(false)}>{text.hide}</Button>
			{:else}
				<Button variant="primary" disabled={busy} onclick={() => saveSchool(true)}>
					{text.show}
				</Button>
			{/if}
		</div>
	</section>

	{#if error}<div class="mt-4"><Notice tone="bad" role="alert">{error}</Notice></div>{/if}
	{#if notice}<div class="mt-4"><Notice role="status">{notice}</Notice></div>{/if}

	<section class="sets">
		<div class="sets-head">
			<fieldset class="sessions">
				<legend class="sr-only">{text.session}</legend>
				{#each sessions.data?.all ?? [] as s (s)}
					<Choice
						name="session"
						value={s}
						pill
						checked={s === session}
						onchange={() => (picked = s)}
					>
						{s}{s === sessions.data?.current ? ` (${text.current})` : ''}
					</Choice>
				{/each}
			</fieldset>
			<div class="actions">
				{#if next && session !== next && (sets.data?.length ?? 0) > 0}
					<Button disabled={busy} onclick={() => (confirmCopy = true)}>
						{text.copy(session ?? '', next)}
					</Button>
				{/if}
				<Button
					variant="primary"
					onclick={() => {
						form = emptySet();
						addError = '';
						adding = true;
					}}
				>
					<PlusIcon size={18} aria-hidden="true" />
					{text.addSet}
				</Button>
			</div>
		</div>

		{#if sets.isLoading}
			<ul class="grid-list" aria-busy="true">
				{#each { length: 4 }, i (i)}<li class="bone h-24 rounded-xl"></li>{/each}
			</ul>
		{:else if (sets.data ?? []).length === 0}
			<p class="empty">{text.noSets(session ?? '')}</p>
		{:else}
			<ul class="grid-list">
				{#each sets.data ?? [] as set (set._id)}
					<li>
						<a
							class="set"
							href={resolve('/admin/schools/[id]/sets/[setId]', { id: schoolId, setId: set._id })}
						>
							<span class="top">
								<span class="label">{set.label}</span>
								{#if set.isActive}<Pill tone="ok">{setText.live}</Pill>{:else}<Pill
										>{setText.hidden}</Pill
									>{/if}
							</span>
							<span class="meta">
								{setText.types[set.type]} · {classRange(set.classFrom, set.classTo)} · {setText.lines(
									set.lines
								)}
							</span>
							<span class="flags">
								{#if set.hidden}<Pill tone="bad">{setText.hiddenLines(set.hidden)}</Pill>{/if}
								{#if set.outOfStock}<Pill tone="warn">{setText.outLines(set.outOfStock)}</Pill>{/if}
								{#if set.problem && !set.isActive}<span class="problem">{set.problem}</span>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<Modal bind:open={adding} title={setText.addTitle} closeLabel={text.close}>
		<form class="flex flex-col gap-4" onsubmit={addSet}>
			<SetFields bind:form />
			{#if addError}<Notice tone="bad" role="alert">{addError}</Notice>{/if}
			<Button type="submit" variant="primary" disabled={busy}>{setText.create}</Button>
		</form>
	</Modal>

	<ConfirmDialog
		bind:open={confirmCopy}
		title={text.copyTitle(next ?? '')}
		description={text.copyDescription}
		confirmLabel={text.copy(session ?? '', next ?? '')}
		cancelLabel={text.cancel}
		onconfirm={copy}
	/>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.back {
		@apply mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-muted;
	}
	.head {
		@apply mb-4 flex flex-wrap items-center gap-3;

		h1 {
			@apply text-2xl font-extrabold;
		}
	}
	.name-form {
		@apply flex flex-wrap items-end gap-2;

		& > :first-child {
			@apply min-w-60 flex-1;
		}
	}
	.sets {
		@apply mt-6 flex flex-col gap-3;
	}
	.sets-head {
		@apply flex flex-wrap items-center justify-between gap-3;
	}
	.sessions,
	.actions {
		@apply flex flex-wrap gap-2;
	}
	.grid-list {
		@apply grid gap-2 sm:grid-cols-2;
	}
	.set {
		@apply flex h-full press flex-col gap-1 rounded-xl raised p-3;
	}
	.top {
		@apply flex items-start justify-between gap-2;
	}
	.label {
		@apply font-bold;
	}
	.meta {
		@apply text-xs text-text-muted;
	}
	.flags {
		@apply flex flex-wrap items-center gap-1;
	}
	.problem {
		@apply text-xs text-text-muted;
	}
	.empty {
		@apply py-10 text-center text-text-muted;
	}
</style>
