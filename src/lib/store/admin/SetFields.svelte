<script lang="ts">
	import { CLASS_LABELS, FIRST_CLASS, LAST_CLASS } from '#convex/model/store/classes.js';
	import { strings } from '#lib/store/strings.js';
	import Field from '#lib/ui/Field.svelte';
	import type { SetForm } from './setForm.js';

	// A set's details. The type is picked only when the set is created.
	let { form = $bindable(), typeLocked = false }: { form: SetForm; typeLocked?: boolean } =
		$props();
	const text = strings.admin.sets;
	const product = strings.admin.product;
	const classes = Array.from({ length: LAST_CLASS - FIRST_CLASS + 1 }, (_, i) => FIRST_CLASS + i);
</script>

<div class="grid">
	{#if !typeLocked}
		<Field label={text.type}>
			<select bind:value={form.type}>
				<option value="books">{text.types.books}</option>
				<option value="uniform">{text.types.uniform}</option>
			</select>
		</Field>
	{/if}
	<div class="wide">
		<Field label={text.label} hint={text.labelHint}>
			<input bind:value={form.label} required maxlength="80" />
		</Field>
	</div>
	<Field label={text.classFrom}>
		<select bind:value={form.classFrom} required>
			{#each classes as c (c)}<option value={String(c)}>{CLASS_LABELS[c]}</option>{/each}
		</select>
	</Field>
	<Field label={text.classTo}>
		<select bind:value={form.classTo} required>
			{#each classes as c (c)}<option value={String(c)}>{CLASS_LABELS[c]}</option>{/each}
		</select>
	</Field>
	{#if form.type === 'uniform'}
		<Field label={text.gender}>
			<select bind:value={form.gender} required>
				<option value="" disabled>—</option>
				{#each ['boys', 'girls', 'unisex'] as const as g (g)}
					<option value={g}>{product.genders[g]}</option>
				{/each}
			</select>
		</Field>
		<Field label={text.uniformType}>
			<select bind:value={form.uniformType} required>
				<option value="" disabled>—</option>
				{#each ['regular', 'sports', 'winter'] as const as u (u)}
					<option value={u}>{product.uniformTypes[u]}</option>
				{/each}
			</select>
		</Field>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.grid {
		@apply grid gap-3 sm:grid-cols-2;
	}
	.wide {
		@apply sm:col-span-2;
	}
</style>
