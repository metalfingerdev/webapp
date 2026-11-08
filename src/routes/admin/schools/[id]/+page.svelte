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
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Choice from '#lib/ui/Choice.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';
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

<div class="school">
	{#if schoolResult.isLoading}
		<div class="waiting"><Spinner /></div>
	{:else if !school}
		<Notice tone="warn" role="status">{text.notFound}</Notice>
	{:else}
		<PageHead
			title={school.name}
			size="headline"
			back={{ href: resolve('/admin/schools'), label: text.back }}
		>
			{#if school.isActive}<Pill tone="ok">{text.live}</Pill>{:else}<Pill>{text.hidden}</Pill>{/if}
		</PageHead>

		<section class="card">
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
			<div class="visibility">
				{#if school.isActive}
					<Button disabled={busy} onclick={() => saveSchool(false)}>{text.hide}</Button>
				{:else}
					<Button variant="primary" disabled={busy} onclick={() => saveSchool(true)}>
						{text.show}
					</Button>
				{/if}
			</div>
		</section>

		{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
		{#if notice}<Notice role="status">{notice}</Notice>{/if}

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
					{#each { length: 4 }, i (i)}<li class="bone"></li>{/each}
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
									{#if set.outOfStock}<Pill tone="warn">{setText.outLines(set.outOfStock)}</Pill
										>{/if}
									{#if set.problem && !set.isActive}<span class="problem">{set.problem}</span>{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<Modal bind:open={adding} title={setText.addTitle} closeLabel={text.close}>
			<form class="new-set" onsubmit={addSet}>
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
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.school {
		@apply flex flex-col gap-5;

		div.waiting {
			@apply flex justify-center py-16;
		}
		section.card {
			@apply flex flex-col gap-4 rounded-[1.75rem] raised p-5;

			form.name-form {
				@apply flex flex-wrap items-end gap-2;

				& > :first-child {
					@apply min-w-60 flex-1;
				}
			}
		}

		section.sets {
			@apply mt-4 flex flex-col gap-4;

			div.sets-head {
				@apply flex flex-wrap items-center justify-between gap-3;
			}
			:is(fieldset.sessions, div.actions) {
				@apply flex flex-wrap gap-2;
			}
			ul.grid-list {
				@apply grid gap-4 sm:grid-cols-2;

				li.bone {
					@apply h-28 rounded-3xl;
				}
			}
			a.set {
				@apply flex h-full press flex-col gap-1.5 rounded-3xl raised p-5;

				span.top {
					@apply flex items-start justify-between gap-2;
				}
				span.label {
					@apply type-title text-lg;
				}
				span.meta {
					@apply text-xs text-text-muted;
				}
				span.flags {
					@apply flex flex-wrap items-center gap-1;
				}
				span.problem {
					@apply text-xs text-text-muted;
				}
			}
			p.empty {
				@apply py-10 text-center text-text-muted;
			}
		}
	}
	form.new-set {
		@apply flex flex-col gap-4;
	}
</style>
