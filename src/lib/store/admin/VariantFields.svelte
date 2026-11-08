<script lang="ts">
	import { strings } from '#lib/store/strings.js';
	import Field from '#lib/ui/Field.svelte';
	import Switch from '#lib/ui/Switch.svelte';
	import type { VariantState } from './productForm.js';

	// One size's fields: label, codes, prices, low-stock level. Stock is never edited here.
	let { form = $bindable(), sized = false }: { form: VariantState; sized?: boolean } = $props();
	const text = strings.admin.sizes;
</script>

<div class="fields">
	<Field label={text.label} hint={text.labelHint}>
		<input bind:value={form.label} required maxlength="60" />
	</Field>
	<Field label={text.sku} hint={text.skuHint}>
		<input bind:value={form.sku} />
	</Field>
	{#if sized}
		<Field label={text.size}><input bind:value={form.size} /></Field>
		<Field label={text.house}><input bind:value={form.house} /></Field>
	{/if}
	<Field label={text.mrp}>
		<input bind:value={form.mrp} inputmode="decimal" />
	</Field>
	<Field label={text.price}>
		<input bind:value={form.price} inputmode="decimal" required />
	</Field>
	<Field label={text.purchasePrice} hint={text.purchaseHint}>
		<input bind:value={form.purchasePrice} inputmode="decimal" />
	</Field>
	<Field label={text.lowStockAt}>
		<input bind:value={form.lowStockAt} inputmode="numeric" />
	</Field>
	<div class="wide">
		<Switch bind:checked={form.isActive}>{text.active}</Switch>
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.fields {
		@apply grid gap-4 sm:grid-cols-2;

		div.wide {
			@apply sm:col-span-2;
		}
	}
</style>
