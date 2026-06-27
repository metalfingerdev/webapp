<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { Modal, Field, Button } from '../ui/index.js';
	import { useDashboard, type Category, type Product } from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	let open = $state(false);
	let editingId = $state<Id<'products'> | null>(null);
	let submitting = $state(false);

	const blank = () => ({
		name: '',
		weight: 0,
		imageUrl: '',
		category: 'book' as Category,
		priceRupees: 0,
		stock: 0,
		author: '',
		subject: '',
		bookSchool: '' as Id<'schools'> | '',
		gender: '',
		size: '',
		variant: 'white' as 'white' | 'sports',
		clothesSchool: '' as Id<'schools'> | '',
		itemType: ''
	});

	let f = $state(blank());

	export function openCreate() {
		editingId = null;
		f = blank();
		open = true;
	}

	export function openEdit(p: Product) {
		editingId = p._id;
		f = blank();
		f.name = p.name;
		f.weight = p.weight;
		f.imageUrl = p.imageUrl ?? '';
		f.category = p.category;
		f.priceRupees = p.salePrice / 100;
		f.stock = p.stock;
		const d = p.details;
		if (d.type === 'book') {
			f.author = d.author;
			f.subject = d.subject;
			f.bookSchool = (d.school as Id<'schools'>) ?? '';
		} else if (d.type === 'clothes') {
			f.gender = d.gender;
			f.size = d.size;
			f.variant = d.variant;
			f.clothesSchool = (d.school as Id<'schools'>) ?? '';
		} else {
			f.itemType = d.itemType;
		}
		open = true;
	}

	function buildDetails() {
		if (f.category === 'book') {
			return {
				type: 'book' as const,
				author: f.author,
				subject: f.subject,
				...(f.bookSchool ? { school: f.bookSchool as Id<'schools'> } : {})
			};
		}
		if (f.category === 'clothes') {
			return {
				type: 'clothes' as const,
				gender: f.gender,
				size: f.size,
				variant: f.variant,
				...(f.clothesSchool ? { school: f.clothesSchool as Id<'schools'> } : {})
			};
		}
		return { type: 'stationary' as const, itemType: f.itemType };
	}

	async function submit() {
		submitting = true;
		try {
			const payload = {
				name: f.name,
				weight: f.weight,
				imageUrl: f.imageUrl || undefined,
				category: f.category,
				salePrice: Math.round(f.priceRupees * 100),
				stock: f.stock,
				details: buildDetails()
			};
			if (editingId) await dash.updateProduct({ id: editingId, ...payload });
			else await dash.createProduct(payload);
			open = false;
		} finally {
			submitting = false;
		}
	}
</script>

<Modal bind:open title={editingId ? 'Edit product' : 'New product'}>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Field label="Name" class="col-span-2"><input bind:value={f.name} /></Field>
		<Field label="Price (₹)"
			><input type="number" min="0" step="0.01" bind:value={f.priceRupees} /></Field
		>
		<Field label="Stock"><input type="number" min="0" bind:value={f.stock} /></Field>
		<Field label="Weight (g)"
			><input type="number" min="0" step="0.01" bind:value={f.weight} /></Field
		>
		<Field label="Category">
			<select bind:value={f.category}>
				<option value="book">Book</option>
				<option value="clothes">Clothes</option>
				<option value="stationary">Stationary</option>
			</select>
		</Field>
		<Field label="Image URL" class="col-span-2"
			><input bind:value={f.imageUrl} placeholder="optional" /></Field
		>

		{#if f.category === 'book'}
			<Field label="Author"><input bind:value={f.author} /></Field>
			<Field label="Subject"><input bind:value={f.subject} /></Field>
			<Field label="School" class="col-span-2">
				<select bind:value={f.bookSchool}>
					<option value="">— None —</option>
					{#each dash.schools.data ?? [] as s (s._id)}<option value={s._id}>{s.name}</option>{/each}
				</select>
			</Field>
		{:else if f.category === 'clothes'}
			<Field label="Gender"><input bind:value={f.gender} /></Field>
			<Field label="Size"><input bind:value={f.size} /></Field>
			<Field label="Variant">
				<select bind:value={f.variant}>
					<option value="white">White</option>
					<option value="sports">Sports</option>
				</select>
			</Field>
			<Field label="School">
				<select bind:value={f.clothesSchool}>
					<option value="">— None —</option>
					{#each dash.schools.data ?? [] as s (s._id)}<option value={s._id}>{s.name}</option>{/each}
				</select>
			</Field>
		{:else}
			<Field label="Item type" class="col-span-2"><input bind:value={f.itemType} /></Field>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		<Button onclick={submit} disabled={submitting || !f.name}>
			{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
		</Button>
	{/snippet}
</Modal>
