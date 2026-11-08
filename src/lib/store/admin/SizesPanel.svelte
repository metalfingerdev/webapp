<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { errorText, formatPrice } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import VariantFields from './VariantFields.svelte';
	import { emptyVariant, toVariantInput, variantState, type VariantState } from './productForm.js';

	type Product = NonNullable<FunctionReturnType<typeof api.store.admin.products.get>>;

	// The product's sizes with price and stock; tapping one selects it for the stock panel.
	let {
		product,
		selected = $bindable()
	}: { product: Product; selected: Id<'productVariants'> | undefined } = $props();
	const text = strings.admin.sizes;
	const client = useConvexClient();

	let open = $state(false);
	let editing = $state<Id<'productVariants'> | undefined>();
	let form = $state<VariantState>(emptyVariant());
	let error = $state('');
	let busy = $state(false);

	const edit = (variant?: Product['variants'][number]) => {
		editing = variant?._id;
		form = variant ? variantState(variant) : { ...emptyVariant(), label: '' };
		error = '';
		open = true;
	};

	const save = async (event: SubmitEvent) => {
		event.preventDefault();
		const v = toVariantInput(form);
		if (!v.ok) return (error = v.error);
		busy = true;
		error = '';
		try {
			const id = await client.mutation(api.store.admin.products.saveVariant, {
				productId: product._id,
				variantId: editing,
				variant: v.value
			});
			selected = id;
			open = false;
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};
</script>

<ul class="sizes">
	{#each product.variants as variant (variant._id)}
		<li class="size" class:on={selected === variant._id}>
			<button type="button" class="pick" onclick={() => (selected = variant._id)}>
				<span class="label">{variant.label}</span>
				<span class="meta">
					{formatPrice(variant.price)}{variant.mrp > variant.price
						? ` · ${text.mrpShort} ${formatPrice(variant.mrp)}`
						: ''}{variant.sku ? ` · ${variant.sku}` : ''}
				</span>
			</button>
			{#if !variant.isActive}<Pill>{text.inactive}</Pill>{/if}
			{#if variant.stock === 0}<Pill tone="bad">{variant.stock}</Pill>
			{:else if variant.stock <= variant.lowStockAt}<Pill tone="warn">{variant.stock}</Pill>
			{:else}<Pill tone="ok">{variant.stock}</Pill>{/if}
			<Button onclick={() => edit(variant)}>{text.edit}</Button>
		</li>
	{/each}
</ul>
<div class="add">
	<Button onclick={() => edit()}>{text.add}</Button>
</div>

<Modal bind:open title={editing ? text.editTitle : text.addTitle} closeLabel={text.close}>
	<form class="size-form" onsubmit={save}>
		<VariantFields bind:form sized={product.kind === 'uniform'} />
		{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
		<Button type="submit" variant="primary" disabled={busy}>{text.save}</Button>
	</form>
</Modal>

<style lang="postcss">
	@reference 'src/app.css';

	ul.sizes {
		@apply flex flex-col gap-2;

		li.size {
			@apply flex items-center gap-2 rounded-2xl sunken p-1.5 pr-2;

			&.on {
				@apply raised;
			}
			button.pick {
				@apply flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-xl px-3 text-left;
			}
			span.label {
				@apply text-sm font-bold;
			}
			span.meta {
				@apply truncate text-xs text-text-muted;
			}
		}
	}
	div.add {
		@apply mt-3;
	}
	form.size-form {
		@apply flex flex-col gap-4;
	}
</style>
