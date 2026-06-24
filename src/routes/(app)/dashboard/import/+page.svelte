<script lang="ts">
	import { read, utils } from 'xlsx';
	import { useMutation } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';

	type Category = 'book' | 'clothes' | 'stationary';
	type TaxCategory =
		| 'Exempt'
		| 'GST 5%'
		| 'GST 18%'
		| 'GST 0%'
		| 'GST 12 to 5%'
		| 'GST 12 to 0%'
		| 'GST 12 to 18%'
		| 'None';

	type Details =
		| { type: 'book'; author: string; subject: string }
		| { type: 'clothes'; gender: string; size: string; variant: 'sports' | 'white' }
		| { type: 'stationary'; itemType: string };

	interface ParsedRow {
		name: string;
		salePrice: number;
		maxRetailPrice: number;
		purchasePrice: number;
		stock: number;
		category: Category;
		hsnCode: string;
		barcode: string;
		unit: string;
		taxCategory: TaxCategory | undefined;
		details: Details;
		valid: boolean;
		error?: string;
	}

	const bulkImport = useMutation(api.products.bulkImport);

	let rows = $state<ParsedRow[]>([]);
	let importing = $state(false);
	let result = $state<{ imported: number; skipped: number } | null>(null);
	let fileError = $state<string | null>(null);

	function inferCategory(hsn: string): Category {
		const h = String(hsn).trim();
		if (h.startsWith('4901') || h.startsWith('490110')) return 'book';
		return 'stationary';
	}

	function makeDetails(category: Category): Details {
		if (category === 'book') return { type: 'book', author: '', subject: '' };
		if (category === 'clothes') return { type: 'clothes', gender: '', size: '', variant: 'white' };
		return { type: 'stationary', itemType: '' };
	}

	function parseName(raw: string): string {
		return String(raw)
			.replace(/^\d+\s+/, '')
			.trim();
	}

	function parsePrice(raw: unknown): number {
		if (raw == null) return 0;
		const n = parseFloat(String(raw).trim());
		return isNaN(n) ? 0 : Math.round(n * 100); // paise
	}

	function normalizeTax(raw: unknown): TaxCategory | undefined {
		const s = String(raw ?? '').trim();
		const valid: TaxCategory[] = [
			'Exempt',
			'GST 5%',
			'GST 18%',
			'GST 0%',
			'GST 12 to 5%',
			'GST 12 to 0%',
			'GST 12 to 18%',
			'None'
		];
		if ((valid as string[]).includes(s)) return s as TaxCategory;
		return undefined;
	}

	function validate(row: ParsedRow): { valid: boolean; error?: string } {
		if (!row.name) return { valid: false, error: 'Missing name' };
		if (row.salePrice < 0) return { valid: false, error: 'Invalid price' };
		return { valid: true };
	}

	function handleFile(e: Event) {
		fileError = null;
		result = null;
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const wb = read(ev.target!.result, { type: 'array' });
				const ws = wb.Sheets[wb.SheetNames[0]];
				const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1, defval: null });

				// Row 7 (index) is header, data starts at 8, last row is totals footer
				const dataRows = raw
					.slice(8)
					.filter((r) => r[6] != null && String(r[6]).trim() !== 'Total');

				rows = dataRows.map((r): ParsedRow => {
					const rawName = String(r[6] ?? '');
					const name = parseName(rawName);
					const hsnCode = String(r[5] ?? '');
					const category = inferCategory(hsnCode);
					const row: ParsedRow = {
						name,
						salePrice: parsePrice(r[4]),
						maxRetailPrice: parsePrice(r[0]),
						purchasePrice: parsePrice(r[3]),
						stock: typeof r[7] === 'number' ? r[7] : parseInt(String(r[7] ?? '0')) || 0,
						category,
						hsnCode,
						barcode: String(r[1] ?? '').trim(),
						unit: String(r[8] ?? 'Pcs.').trim(),
						taxCategory: normalizeTax(r[2]),
						details: makeDetails(category),
						valid: false
					};
					const { valid, error } = validate(row);
					row.valid = valid;
					row.error = error;
					return row;
				});
			} catch (err) {
				fileError = err instanceof Error ? err.message : 'Failed to parse file.';
			}
		};
		reader.readAsArrayBuffer(file);
	}

	function revalidate(i: number) {
		const { valid, error } = validate(rows[i]);
		rows[i].valid = valid;
		rows[i].error = error;
	}

	function changeCategory(i: number, category: Category) {
		rows[i].category = category;
		rows[i].details = makeDetails(category);
		revalidate(i);
	}

	function removeRow(i: number) {
		rows.splice(i, 1);
	}

	async function handleImport() {
		const valid = rows.filter((r) => r.valid);
		if (!valid.length) return;
		importing = true;
		try {
			result = await bulkImport({
				products: valid.map((r) => ({
					name: r.name,
					salePrice: r.salePrice,
					maxRetailPrice: r.maxRetailPrice || undefined,
					purchasePrice: r.purchasePrice || undefined,
					stock: r.stock,
					weight: 0,
					category: r.category,
					hsnCode: r.hsnCode || undefined,
					barcode: r.barcode || undefined,
					unit: r.unit || undefined,
					taxCategory: r.taxCategory || undefined,
					details: r.details
				}))
			});
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
	<p>{fileError}</p>
{/if}

{#if result}
	<p>Imported {result.imported}. Skipped {result.skipped}.</p>
{/if}

{#if rows.length > 0}
	<p>
		{rows.length} rows · {validCount} valid {invalidCount > 0 ? `· ${invalidCount} invalid` : ''}
	</p>

	<button onclick={handleImport} disabled={importing || validCount === 0}>
		{importing ? 'Importing...' : `Import ${validCount} products`}
	</button>

	<table>
		<thead>
			<tr>
				<th>#</th>
				<th>Name</th>
				<th>Category</th>
				<th>MRP (₹)</th>
				<th>Sale (₹)</th>
				<th>Stock</th>
				<th>Tax</th>
				<th>HSN</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i}
				<tr title={row.error}>
					<td>{i + 1}</td>
					<td>
						<input
							value={row.name}
							oninput={(e) => {
								rows[i].name = e.currentTarget.value;
								revalidate(i);
							}}
						/>
					</td>
					<td>
						<select
							value={row.category}
							onchange={(e) => changeCategory(i, e.currentTarget.value as Category)}
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
								rows[i].maxRetailPrice = Math.round(parseFloat(e.currentTarget.value) * 100);
							}}
						/>
					</td>
					<td>
						<input
							type="number"
							value={row.salePrice / 100}
							oninput={(e) => {
								rows[i].salePrice = Math.round(parseFloat(e.currentTarget.value) * 100);
								revalidate(i);
							}}
						/>
					</td>
					<td>
						<input
							type="number"
							value={row.stock}
							oninput={(e) => {
								rows[i].stock = parseInt(e.currentTarget.value) || 0;
							}}
						/>
					</td>
					<td>{row.taxCategory ?? '—'}</td>
					<td>{row.hsnCode}</td>
					<td><button onclick={() => removeRow(i)}>×</button></td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
