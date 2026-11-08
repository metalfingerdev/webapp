<script lang="ts">
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import type { ImportRow, StockMode } from '#convex/model/store/importPlan.js';
	import { MAX_IMPORT_ROWS } from '#convex/model/store/importPlan.js';
	import { parseSheet } from '#lib/store/admin/parseSheet.js';
	import { toRupeeInput } from '#lib/store/admin/money.js';
	import { errorText } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Choice from '#lib/ui/Choice.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';

	type Plan = FunctionReturnType<typeof api.store.admin.import.plan>;

	const text = strings.admin.import;
	const client = useConvexClient();
	const options = useQuery(api.store.admin.products.options, {});

	let rows = $state<ImportRow[]>([]);
	let fileName = $state('');
	let stockMode = $state<StockMode>('keep');
	let newCategoryId = $state('');
	let plan = $state<Plan | undefined>();
	let showAll = $state(false);
	let busy = $state('');
	let error = $state('');
	let done = $state('');

	// Changing the sheet or an option makes the old preview meaningless
	const reset = () => {
		plan = undefined;
		done = '';
		error = '';
	};

	const pickFile = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		reset();
		rows = [];
		if (!file) return;
		fileName = file.name;
		busy = text.reading;
		try {
			const parsed = await parseSheet(await file.arrayBuffer());
			if (parsed.length === 0) error = text.unreadable;
			else if (parsed.length > MAX_IMPORT_ROWS) error = text.tooMany(MAX_IMPORT_ROWS);
			else rows = parsed;
		} catch {
			error = text.unreadable;
		} finally {
			busy = '';
		}
	};

	const importOptions = () => ({
		stockMode,
		newCategoryId: newCategoryId ? (newCategoryId as Id<'categories'>) : undefined
	});

	// A one-off read, not a live query: the preview must not change under the admin's eyes
	const preview = async () => {
		reset();
		busy = text.previewing;
		try {
			plan = await client.query(api.store.admin.import.plan, { rows, options: importOptions() });
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = '';
		}
	};

	const apply = async () => {
		if (!plan) return;
		busy = text.applying;
		error = '';
		try {
			const result = await client.mutation(api.store.admin.import.apply, {
				rows,
				options: importOptions(),
				fingerprint: plan.fingerprint
			});
			done = text.done(result.created, result.updated);
			plan = undefined;
			rows = [];
			fileName = '';
		} catch (e) {
			error = errorText(e, strings.admin.failed);
			plan = undefined;
		} finally {
			busy = '';
		}
	};

	const counts = $derived(
		plan
			? {
					new: plan.rows.filter((r) => r.status === 'new').length,
					update: plan.rows.filter((r) => r.status === 'update').length,
					unchanged: plan.rows.filter((r) => r.status === 'unchanged').length,
					error: plan.rows.filter((r) => r.status === 'error').length
				}
			: undefined
	);
	const applicable = $derived(counts ? counts.new + counts.update : 0);
	const shown = $derived(
		plan ? (showAll ? plan.rows : plan.rows.filter((r) => r.status !== 'unchanged')) : []
	);

	const money = new Set(['price', 'mrp', 'purchasePrice']);
	const show = (field: string, value: string | number | null) => {
		if (value === null) return '—';
		if (money.has(field) && typeof value === 'number') return `₹${toRupeeInput(value)}`;
		if (field === 'gstRate')
			return value === 'exempt' ? strings.admin.product.gstRates.exempt : `${Number(value) / 100}%`;
		return String(value);
	};
	const tone = { new: 'ok', update: 'warn', unchanged: 'plain', error: 'bad' } as const;
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<PageHead
	title={text.title}
	lead={text.intro}
	size="headline"
	back={{ href: resolve('/admin/products'), label: strings.admin.product.back }}
/>

<div class="import">
	<section class="setup">
		<label class="file">
			{fileName || text.file}
			<input class="sr-only" type="file" accept=".xlsx,.xls" onchange={pickFile} />
		</label>

		<fieldset>
			<legend>{text.stockMode}</legend>
			<div class="choices">
				{#each ['keep', 'add', 'set'] as const as m (m)}
					<Choice
						name="stockMode"
						value={m}
						checked={stockMode === m}
						onchange={() => {
							stockMode = m;
							reset();
						}}
					>
						<strong>{text.stockModes[m]}</strong>
						<span class="hint">{text.stockModeHint[m]}</span>
					</Choice>
				{/each}
			</div>
		</fieldset>

		<Field label={text.newCategory}>
			<select bind:value={newCategoryId} onchange={reset}>
				<option value="">{text.noCategory}</option>
				{#each options.data?.categories ?? [] as category (category._id)}
					<option value={category._id}>{category.name}</option>
				{/each}
			</select>
		</Field>

		<div>
			<Button variant="primary" onclick={preview} disabled={rows.length === 0 || !!busy}>
				{busy === text.previewing ? text.previewing : `${text.preview} (${rows.length})`}
			</Button>
		</div>
	</section>

	{#if busy === text.reading}<p class="muted">{text.reading}</p>{/if}
	{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
	{#if done}<Notice role="status">{done}</Notice>{/if}

	{#if plan && counts}
		<section class="result">
			<div class="counts">
				{#each ['new', 'update', 'unchanged', 'error'] as const as s (s)}
					<Pill tone={tone[s]}>{text.counts[s]}: {counts[s]}</Pill>
				{/each}
			</div>
			{#if counts.error > 0}<Notice tone="warn" role="status">{text.errorsSkipped}</Notice>{/if}

			<div class="choices">
				<Choice
					name="show"
					value="changes"
					pill
					checked={!showAll}
					onchange={() => (showAll = false)}
				>
					{text.show.changes}
				</Choice>
				<Choice name="show" value="all" pill checked={showAll} onchange={() => (showAll = true)}>
					{text.show.all}
				</Choice>
			</div>

			<table class="rows rtable">
				<thead>
					<tr><th>{text.line}</th><th>{text.code}</th><th>{text.name}</th><th>{text.result}</th></tr
					>
				</thead>
				<tbody>
					{#each shown as row (row.line)}
						<tr>
							<td data-label={text.line}>{row.line}</td>
							<td data-label={text.code}>{row.sku || '—'}</td>
							<td data-label={text.name}>{row.title || '—'}</td>
							<td data-label={text.result}>
								<Pill tone={tone[row.status]}>{text.counts[row.status]}</Pill>
								{#if row.error}<span class="problem">{row.error}</span>{/if}
								{#each row.changes as change (change.field)}
									<span class="change">
										{text.fields[change.field as keyof typeof text.fields] ?? change.field}
										{show(change.field, change.from)} → {show(change.field, change.to)}
									</span>
								{/each}
								{#if row.stockDelta}<span class="change">{text.stockChange(row.stockDelta)}</span
									>{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			{#if applicable > 0}
				<div>
					<Button variant="primary" large onclick={apply} disabled={!!busy}>
						{busy === text.applying ? text.applying : text.apply(applicable)}
					</Button>
				</div>
			{:else}
				<p class="muted">{text.nothing}</p>
			{/if}
		</section>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.import {
		@apply flex flex-col gap-4;

		section.setup {
			@apply flex max-w-3xl flex-col gap-5 rounded-[1.75rem] raised p-5;

			label.file {
				@apply button min-h-11 self-start;
			}
			fieldset {
				@apply flex flex-col gap-2;

				legend {
					@apply mb-2 field-caption;
				}
			}
			span.hint {
				@apply block text-sm text-text-muted;
			}
		}
		div.choices {
			@apply flex flex-wrap gap-2;
		}
		p.muted {
			@apply text-text-muted;
		}

		section.result {
			@apply mt-4 flex flex-col gap-4;

			div.counts {
				@apply flex flex-wrap gap-2;
			}
			/* The preview table sits in a well */
			table.rows {
				@apply data-table overflow-hidden rounded-[1.75rem] sunken text-sm;

				thead th {
					@apply type-kicker;
				}
				tbody tr {
					@apply border-t border-border-muted;
				}
			}
			span.problem {
				@apply text-sm text-danger;
			}
			span.change {
				@apply block text-sm text-text-muted;
			}
		}
	}
</style>
