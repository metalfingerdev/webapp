<script lang="ts">
	import { useMutation } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import {
		makeDetails,
		validate,
		parseWorkbook,
		buildImportPayload,
		type Category,
		type ParsedRow,
		type ImportResult
	} from '$lib/products/index.js';

	const bulkUpsert = useMutation(api.dashboard.bulkUpsertProducts);

	let rows = $state<ParsedRow[]>([]);
	let importing = $state(false);
	let result = $state<ImportResult | null>(null);
	let fileError = $state<string | null>(null);

	// --- Triage controls -----------------------------------------------------
	// Filters surface the rows that need a human eye before committing; sorting
	// is plain in-memory comparison (instant at a few thousand rows).
	const FILTERS: { id: string; label: string; test: (r: ParsedRow) => boolean }[] = [
		{ id: 'all', label: 'All', test: () => true },
		{ id: 'missing-tax', label: 'Missing tax', test: (r) => !r.taxCategory },
		{ id: 'missing-hsn', label: 'Missing HSN', test: (r) => !r.hsnCode },
		{ id: 'negative', label: 'Negative stock', test: (r) => r.stock < 0 },
		{ id: 'invalid', label: 'Invalid', test: (r) => !r.valid }
	];
	let filterId = $state('all');
	let sortKey = $state<keyof ParsedRow | null>(null);
	let sortDir = $state(1); // 1 = asc, -1 = desc

	const activeTest = $derived(FILTERS.find((f) => f.id === filterId)?.test ?? (() => true));

	// Filter, then sort. Keyed by the row object in the `{#each}` so a focused
	// input follows its row when the order changes.
	const displayRows = $derived.by(() => {
		const list = rows.filter(activeTest);
		if (!sortKey) return list;
		const key = sortKey;
		return [...list].sort((a, b) => {
			const av = a[key] ?? '';
			const bv = b[key] ?? '';
			if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
			return String(av).localeCompare(String(bv)) * sortDir;
		});
	});

	function toggleSort(key: keyof ParsedRow) {
		if (sortKey === key) sortDir = -sortDir;
		else {
			sortKey = key;
			sortDir = 1;
		}
	}
	function arrow(key: keyof ParsedRow) {
		return sortKey === key ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
	}

	// --- Row editing (operates on the row reference, never an index) ----------
	function revalidate(row: ParsedRow) {
		const { valid, error } = validate(row);
		row.valid = valid;
		row.error = error;
	}

	function changeCategory(row: ParsedRow, category: Category) {
		row.category = category;
		row.details = makeDetails(category);
		revalidate(row);
	}

	function removeRow(row: ParsedRow) {
		const i = rows.indexOf(row);
		if (i !== -1) rows.splice(i, 1);
	}

	function handleFile(e: Event) {
		fileError = null;
		result = null;
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				rows = parseWorkbook(ev.target!.result as ArrayBuffer);
			} catch (err) {
				fileError = err instanceof Error ? err.message : 'Failed to parse file.';
			}
		};
		reader.readAsArrayBuffer(file);
	}

	async function handleImport() {
		const products = buildImportPayload(rows);
		if (!products.length) return;
		importing = true;
		try {
			result = await bulkUpsert({ products });
			rows = [];
		} catch (err) {
			fileError = err instanceof Error ? err.message : 'Import failed.';
		} finally {
			importing = false;
		}
	}

	let validCount = $derived(rows.filter((r) => r.valid).length);
	let invalidCount = $derived(rows.filter((r) => !r.valid).length);
</script>

<input type="file" accept=".xlsx,.xls" onchange={handleFile} />

{#if fileError}
	<p class="error">{fileError}</p>
{/if}

{#if result}
	<p>Created {result.created} · updated {result.updated} · skipped {result.skipped}.</p>
{/if}

{#if rows.length > 0}
	<p>
		{rows.length} rows · {validCount} valid {invalidCount > 0 ? `· ${invalidCount} invalid` : ''}
	</p>

	<div class="filters">
		{#each FILTERS as f}
			{@const count = rows.filter(f.test).length}
			<button class="chip" class:active={filterId === f.id} onclick={() => (filterId = f.id)}>
				{f.label} ({count})
			</button>
		{/each}
	</div>

	<button onclick={handleImport} disabled={importing || validCount === 0}>
		{importing ? 'Uploading...' : `Upload ${validCount} rows`}
	</button>

	<table>
		<thead>
			<tr>
				<th>#</th>
				<th><button class="sort" onclick={() => toggleSort('code')}>Code{arrow('code')}</button></th
				>
				<th><button class="sort" onclick={() => toggleSort('name')}>Name{arrow('name')}</button></th
				>
				<th>Category</th>
				<th>
					<button class="sort" onclick={() => toggleSort('maxRetailPrice')}>
						MRP (₹){arrow('maxRetailPrice')}
					</button>
				</th>
				<th>
					<button class="sort" onclick={() => toggleSort('salePrice')}>
						Sale (₹){arrow('salePrice')}
					</button>
				</th>
				<th>
					<button class="sort" onclick={() => toggleSort('stock')}>Stock{arrow('stock')}</button>
				</th>
				<th>
					<button class="sort" onclick={() => toggleSort('taxCategory')}
						>Tax{arrow('taxCategory')}</button
					>
				</th>
				<th>
					<button class="sort" onclick={() => toggleSort('hsnCode')}>HSN{arrow('hsnCode')}</button>
				</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each displayRows as row, i (row)}
				<tr title={row.error} class:invalid={!row.valid}>
					<td>{i + 1}</td>
					<td class="code">{row.code || '—'}</td>
					<td>
						<input
							value={row.name}
							oninput={(e) => {
								row.name = e.currentTarget.value;
								revalidate(row);
							}}
						/>
					</td>
					<td>
						<select
							value={row.category}
							onchange={(e) => changeCategory(row, e.currentTarget.value as Category)}
						>
							<option value="book">book</option>
							<option value="stationary">stationary</option>
							<option value="clothes">clothes</option>
						</select>
					</td>
					<td>
						<input
							type="number"
							value={row.maxRetailPrice / 100}
							oninput={(e) => {
								row.maxRetailPrice = Math.round(parseFloat(e.currentTarget.value) * 100);
							}}
						/>
					</td>
					<td>
						<input
							type="number"
							value={row.salePrice / 100}
							oninput={(e) => {
								row.salePrice = Math.round(parseFloat(e.currentTarget.value) * 100);
								revalidate(row);
							}}
						/>
					</td>
					<td>
						<input
							type="number"
							value={row.stock}
							oninput={(e) => {
								row.stock = parseInt(e.currentTarget.value) || 0;
							}}
						/>
					</td>
					<td>{row.taxCategory ?? '—'}</td>
					<td>{row.hsnCode}</td>
					<td><button onclick={() => removeRow(row)}>×</button></td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.error {
		@apply text-red-600;
	}

	.filters {
		@apply my-2 flex flex-wrap gap-2;
	}

	.chip {
		@apply cursor-pointer rounded-full border px-3 py-1 text-sm;

		&.active {
			@apply bg-neutral-800 text-white;
		}
	}

	button.sort {
		@apply cursor-pointer font-semibold;
	}

	tr.invalid {
		@apply bg-red-50;
	}

	td.code {
		@apply font-mono text-sm text-neutral-500;
	}
</style>
