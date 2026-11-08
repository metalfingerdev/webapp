<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { CLASS_LABELS, FIRST_CLASS, LAST_CLASS } from '#convex/model/store/classes.js';
	import { optimizeImage } from '#lib/primitives/utils/optimizeImage.js';
	import { errorText } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Field from '#lib/ui/Field.svelte';
	import { GST_RATES, type ProductState } from './productForm.js';

	// The product's own fields (not its sizes). Native controls: best on cheap phones.
	let {
		form = $bindable(),
		categories,
		schools
	}: {
		form: ProductState;
		categories: { _id: string; name: string; isActive: boolean }[];
		schools: { _id: string; name: string }[];
	} = $props();

	const text = strings.admin.product;
	const f = text.fields;
	const client = useConvexClient();
	const classes = Array.from({ length: LAST_CLASS - FIRST_CLASS + 1 }, (_, i) => FIRST_CLASS + i);

	let uploading = $state(false);
	let photoError = $state('');
	const upload = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;
		photoError = '';
		try {
			const small = await optimizeImage(file, { maxWidth: 600, maxHeight: 800, maxSizeKB: 150 });
			const url = await client.mutation(api.store.admin.products.imageUploadUrl, {});
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': small.type },
				body: small
			});
			if (!response.ok) throw new Error('upload failed');
			const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
			form.imageId = storageId;
			form.imageUrl = URL.createObjectURL(small);
		} catch (e) {
			photoError = errorText(e, strings.admin.failed);
		} finally {
			uploading = false;
			input.value = '';
		}
	};
</script>

<div class="grid">
	<div class="wide">
		<Field label={f.title}>
			<input bind:value={form.title} required maxlength="200" />
		</Field>
	</div>
	<Field label={text.kind}>
		<select bind:value={form.kind}>
			{#each ['book', 'stationery', 'uniform'] as const as kind (kind)}
				<option value={kind}>{text.kinds[kind]}</option>
			{/each}
		</select>
	</Field>
	<Field label={f.category}>
		<select bind:value={form.categoryId} required>
			<option value="" disabled>—</option>
			{#each categories as category (category._id)}
				<option value={category._id}>
					{category.name}{category.isActive ? '' : ` (${strings.admin.products.hidden})`}
				</option>
			{/each}
		</select>
	</Field>

	{#if form.kind === 'book'}
		<Field label={f.author}><input bind:value={form.author} /></Field>
		<Field label={f.publisher}><input bind:value={form.publisher} /></Field>
		<Field label={f.isbn}><input bind:value={form.isbn} inputmode="numeric" /></Field>
		<Field label={f.edition}><input bind:value={form.edition} /></Field>
		<Field label={f.subject}><input bind:value={form.subject} /></Field>
	{/if}

	{#if form.kind === 'uniform'}
		<Field label={f.school}>
			<select bind:value={form.schoolId} required>
				<option value="" disabled>—</option>
				{#each schools as school (school._id)}
					<option value={school._id}>{school.name}</option>
				{/each}
			</select>
		</Field>
		<Field label={f.gender}>
			<select bind:value={form.gender} required>
				<option value="" disabled>—</option>
				{#each ['boys', 'girls', 'unisex'] as const as g (g)}
					<option value={g}>{text.genders[g]}</option>
				{/each}
			</select>
		</Field>
		<Field label={f.uniformType}>
			<select bind:value={form.uniformType} required>
				<option value="" disabled>—</option>
				{#each ['regular', 'sports', 'winter'] as const as u (u)}
					<option value={u}>{text.uniformTypes[u]}</option>
				{/each}
			</select>
		</Field>
		<Field label={f.part}>
			<select bind:value={form.part} required>
				<option value="" disabled>—</option>
				{#each ['top', 'bottom', 'accessory', 'footwear'] as const as p (p)}
					<option value={p}>{text.parts[p]}</option>
				{/each}
			</select>
		</Field>
	{/if}

	<Field label={f.classFrom}>
		<select bind:value={form.classFrom}>
			<option value="">{f.noClass}</option>
			{#each classes as c (c)}<option value={String(c)}>{CLASS_LABELS[c]}</option>{/each}
		</select>
	</Field>
	<Field label={f.classTo}>
		<select bind:value={form.classTo}>
			<option value="">{f.noClass}</option>
			{#each classes as c (c)}<option value={String(c)}>{CLASS_LABELS[c]}</option>{/each}
		</select>
	</Field>

	<Field label={f.hsn} hint={text.hints.hsn}>
		<input bind:value={form.hsn} inputmode="numeric" required />
	</Field>
	<Field label={f.gstRate} hint={text.hints.gstRate}>
		<select bind:value={form.gstRate} required>
			<option value="" disabled>—</option>
			{#each GST_RATES as rate (rate)}<option value={rate}>{text.gstRates[rate]}</option>{/each}
		</select>
	</Field>

	<div class="wide photo">
		{#if form.imageUrl}
			<img src={form.imageUrl} alt="" width="72" height="96" />
		{:else}
			<span class="thumb" aria-hidden="true"></span>
		{/if}
		<div class="photo-actions">
			<label class="button tone-raised">
				{uploading ? f.uploading : form.imageId ? f.changePhoto : f.photo}
				<input
					class="sr-only"
					type="file"
					accept="image/*"
					onchange={upload}
					disabled={uploading}
				/>
			</label>
			{#if form.imageId && !uploading}
				<button
					type="button"
					class="button"
					onclick={() => {
						form.imageId = undefined;
						form.imageUrl = null;
					}}>{f.removePhoto}</button
				>
			{/if}
			{#if photoError}<p class="text-danger text-sm">{photoError}</p>{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.grid {
		@apply grid gap-3 sm:grid-cols-2;
	}
	.wide {
		@apply sm:col-span-2;
	}
	.photo {
		@apply flex items-center gap-3;
	}
	img,
	.thumb {
		@apply h-24 w-18 shrink-0 rounded-lg object-cover;
	}
	.thumb {
		@apply sunken;
	}
	.photo-actions {
		@apply flex flex-wrap items-center gap-2;
	}
</style>
