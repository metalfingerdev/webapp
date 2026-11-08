<script lang="ts">
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { gotoApp } from '#lib/primitives/utils/navigation.js';
	import ProductFields from '#lib/store/admin/ProductFields.svelte';
	import VariantFields from '#lib/store/admin/VariantFields.svelte';
	import {
		emptyProduct,
		emptyVariant,
		toProductInput,
		toVariantInput
	} from '#lib/store/admin/productForm.js';
	import { errorText } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';

	const text = strings.admin.product;
	const client = useConvexClient();
	const options = useQuery(api.store.admin.products.options, {});

	let product = $state(emptyProduct());
	let variant = $state(emptyVariant());
	let error = $state('');
	let busy = $state(false);

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		error = '';
		const p = toProductInput(product);
		if (!p.ok) return (error = p.error);
		const v = toVariantInput(variant);
		if (!v.ok) return (error = v.error);
		busy = true;
		try {
			const id = await client.mutation(api.store.admin.products.create, {
				product: p.value,
				variant: v.value
			});
			await gotoApp(resolve('/admin/products/[id]', { id }), { replace: true });
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>{text.newTitle} · {strings.admin.title}</title>
</svelte:head>

<PageHead
	title={text.newTitle}
	size="headline"
	back={{ href: resolve('/admin/products'), label: text.back }}
/>

<form class="form" onsubmit={submit}>
	<section class="card">
		<h2>{text.details}</h2>
		<ProductFields
			bind:form={product}
			categories={options.data?.categories ?? []}
			schools={options.data?.schools ?? []}
		/>
	</section>
	<section class="card">
		<h2>{strings.admin.sizes.title}</h2>
		<p class="hint">{text.hints.firstSize}</p>
		<VariantFields bind:form={variant} sized={product.kind === 'uniform'} />
	</section>
	{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
	<div>
		<Button variant="primary" large type="submit" disabled={busy}>{text.create}</Button>
	</div>
</form>

<style lang="postcss">
	@reference 'src/app.css';

	form.form {
		@apply flex max-w-3xl flex-col gap-5;

		section.card {
			@apply flex flex-col gap-3 rounded-[1.75rem] raised p-5;

			h2 {
				@apply type-title;
			}
			p.hint {
				@apply text-sm text-text-muted;
			}
		}
	}
</style>
