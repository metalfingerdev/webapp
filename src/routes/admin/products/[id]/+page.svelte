<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import ProductFields from '#lib/store/admin/ProductFields.svelte';
	import SizesPanel from '#lib/store/admin/SizesPanel.svelte';
	import StockPanel from '#lib/store/admin/StockPanel.svelte';
	import { productState, toProductInput, type ProductState } from '#lib/store/admin/productForm.js';
	import { errorText } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';

	const text = strings.admin.product;
	const client = useConvexClient();
	const productId = $derived(page.params.id as Id<'products'>);
	const result = useQuery(api.store.admin.products.get, () => ({ productId }));
	const options = useQuery(api.store.admin.products.options, {});
	const product = $derived(result.data);

	// The form is filled once per product, so live updates (stock moving) never wipe an edit.
	let form = $state<ProductState | undefined>();
	let filledFor = $state<string | undefined>();
	let selected = $state<Id<'productVariants'> | undefined>();
	$effect(() => {
		if (product && filledFor !== product._id) {
			form = productState(product);
			filledFor = product._id;
			selected = product.variants[0]?._id;
		}
	});
	const variant = $derived(product?.variants.find((v) => v._id === selected));

	let error = $state('');
	let saved = $state(false);
	let busy = $state(false);
	let confirmHide = $state(false);

	const save = async (event: SubmitEvent) => {
		event.preventDefault();
		if (!form || !product) return;
		error = '';
		saved = false;
		const input = toProductInput(form);
		if (!input.ok) return (error = input.error);
		busy = true;
		try {
			await client.mutation(api.store.admin.products.update, {
				productId: product._id,
				product: input.value
			});
			saved = true;
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	const setActive = async (isActive: boolean) => {
		if (!product) return;
		error = '';
		try {
			await client.mutation(api.store.admin.products.setActive, {
				productId: product._id,
				isActive
			});
			confirmHide = false;
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		}
	};
</script>

<svelte:head>
	<title>{product?.title ?? text.back} · {strings.admin.title}</title>
</svelte:head>

<div class="product">
	{#if result.isLoading || (product && !form)}
		<div class="waiting"><Spinner /></div>
	{:else if !product || !form}
		<Notice tone="warn" role="status">{text.notFound}</Notice>
	{:else}
		<PageHead
			title={product.title}
			size="headline"
			back={{ href: resolve('/admin/products'), label: text.back }}
		>
			{#if product.isActive}
				<Button onclick={() => (confirmHide = true)}>{text.hide}</Button>
			{:else}
				<Button variant="primary" onclick={() => setActive(true)}>{text.show}</Button>
			{/if}
		</PageHead>
		{#if !product.isActive}<Notice tone="warn" role="status">{text.hiddenNotice}</Notice>{/if}

		<div class="layout">
			<form class="card" onsubmit={save}>
				<h2>{text.details}</h2>
				<ProductFields
					bind:form
					categories={options.data?.categories ?? []}
					schools={options.data?.schools ?? []}
				/>
				{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
				<div class="save">
					<Button type="submit" variant="primary" disabled={busy}>{text.save}</Button>
					{#if saved}<span class="saved" role="status">{text.saved}</span>{/if}
				</div>
			</form>

			<div class="side">
				<section class="card">
					<h2>{strings.admin.sizes.title}</h2>
					<SizesPanel {product} bind:selected />
				</section>
				{#if variant}
					<section class="card">
						<h2>
							{strings.admin.stock.title}{product.variants.length > 1 ? ` · ${variant.label}` : ''}
						</h2>
						{#key variant._id}<StockPanel {variant} />{/key}
					</section>
				{/if}
			</div>
		</div>

		<ConfirmDialog
			bind:open={confirmHide}
			title={text.hideConfirm}
			description={text.hideDescription}
			confirmLabel={text.hide}
			cancelLabel={text.cancel}
			onconfirm={() => setActive(false)}
		/>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.product {
		@apply flex flex-col gap-4;

		div.waiting {
			@apply flex justify-center py-16;
		}
		div.layout {
			@apply grid items-start gap-5 lg:grid-cols-[3fr_2fr];
		}
		div.side {
			@apply flex flex-col gap-5;
		}
		:is(form, section).card {
			@apply flex flex-col gap-3 rounded-[1.75rem] raised p-5;

			h2 {
				@apply type-title;
			}
		}
		div.save {
			@apply mt-2 flex items-center gap-3;

			span.saved {
				@apply text-sm font-bold text-success;
			}
		}
	}
</style>
