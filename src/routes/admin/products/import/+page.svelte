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
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Choice from '#lib/ui/Choice.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

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

<a class="back" href={resolve('/admin/products')}>
	<ArrowLeftIcon size={18} aria-hidden="true" />
	{strings.admin.product.back}
</a>
<h1 class="mb-2 text-2xl font-extrabold">{text.title}</h1>
<p class="intro">{text.intro}</p>

<section class="panel setup">
	<label class="button tone-raised self-start">
		{fileName || text.file}
		<input class="sr-only" type="file" accept=".xlsx,.xls" onchange={pickFile} />
	</label>

	<fieldset>
		<legend class="field-caption">{text.stockMode}</legend>
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
					<span class="font-bold">{text.stockModes[m]}</span>
					<span class="text-text-muted block text-sm">{text.stockModeHint[m]}</span>
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

{#if busy === text.reading}<p class="text-text-muted mt-4">{text.reading}</p>{/if}
{#if error}<div class="mt-4"><Notice tone="bad" role="alert">{error}</Notice></div>{/if}
{#if done}<div class="mt-4"><Notice role="status">{done}</Notice></div>{/if}

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

		<table class="data-table rtable">
			<thead>
				<tr><th>{text.line}</th><th>{text.code}</th><th>{text.name}</th><th>{text.result}</th></tr>
			</thead>
			<tbody>
				{#each shown as row (row.line)}
					<tr>
						<td data-label={text.line}>{row.line}</td>
						<td data-label={text.code}>{row.sku || '—'}</td>
						<td data-label={text.name}>{row.title || '—'}</td>
						<td data-label={text.result}>
							<Pill tone={tone[row.status]}>{text.counts[row.status]}</Pill>
							{#if row.error}<span class="text-danger text-sm">{row.error}</span>{/if}
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
			<p class="text-text-muted">{text.nothing}</p>
		{/if}
	</section>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.back {
		@apply mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-muted;
	}
	.intro {
		@apply mb-4 max-w-2xl text-sm text-text-muted;
	}
	.setup {
		@apply flex max-w-3xl flex-col gap-4 p-4;
	}
	fieldset {
		@apply flex flex-col gap-2;
	}
	.choices {
		@apply flex flex-wrap gap-2;
	}
	.result {
		@apply mt-6 flex flex-col gap-3;
	}
	.counts {
		@apply flex flex-wrap gap-2;
	}
	.change {
		@apply block text-sm text-text-muted;
	}
</style>
