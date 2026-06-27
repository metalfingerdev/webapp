<script lang="ts">
	import { useCart } from '$lib/cart/index.js';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '$convex/_generated/api.js';

	type Result = {
		data: FunctionReturnType<typeof api.bundle.getBundleBySchoolAndGrade> | undefined;
		isLoading: boolean;
	};
	let { bundle: result }: { bundle: Result } = $props();

	const cart = useCart();
	const bundle = $derived(result.data);

	const inr = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

	// Add every in-stock line at its bundle quantity, tagged with bundle context.
	function addBundleToCart(b: NonNullable<typeof bundle>) {
		for (const item of b.items) {
			if (item.stock <= 0) continue;
			cart.addItem({
				productId: item.productId,
				name: item.name,
				price: item.salePrice,
				category: item.category,
				stock: item.stock,
				bundleContext: { schoolId: b.schoolId, grade: b.grade, schoolName: b.schoolName }
			});
			if (item.quantity > 1) cart.changeQuantity(item.productId, item.quantity - 1);
		}
	}
</script>

<svelte:head>
	<title>{bundle ? `${bundle.schoolName} — ${bundle.grade} bundle` : 'Bundle'}</title>
</svelte:head>

{#if result.isLoading}
	<p class="status">Loading bundle…</p>
{:else if !bundle}
	<p class="status">Bundle not found.</p>
{:else}
	<section class="bundle">
		<header class="head">
			<p class="eyebrow">{bundle.schoolName}</p>
			<h1>{bundle.grade} bundle</h1>
			<p class="sub">{bundle.items.length} items · {inr(bundle.total)}</p>
			<button class="add-all" onclick={() => addBundleToCart(bundle)}>Add bundle to cart</button>
		</header>

		<ul class="items">
			{#each bundle.items as item (item.productId)}
				<li class="item" class:out={item.stock <= 0}>
					<a class="link" href="/shop/{item.category}/{item.slug}">{item.name}</a>
					<span class="qty">×{item.quantity}</span>
					<span class="price">{inr(item.salePrice * item.quantity)}</span>
					{#if item.stock <= 0}<span class="oos">Out of stock</span>{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.status {
		@apply p-6 text-sm text-neutral-500;
	}
	.bundle {
		@apply mx-auto grid max-w-2xl gap-6 p-4;
	}
	.head {
		@apply grid gap-1;

		.eyebrow {
			@apply text-sm font-medium text-neutral-500;
		}
		h1 {
			@apply text-2xl font-semibold text-neutral-900;
		}
		.sub {
			@apply text-sm text-neutral-500;
		}
		.add-all {
			@apply mt-2 w-fit cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800;
		}
	}
	.items {
		@apply grid gap-1;

		.item {
			@apply flex items-center gap-3 rounded-lg border border-neutral-100 px-3 py-2.5 text-sm;
		}
		.out {
			@apply opacity-60;
		}
		.link {
			@apply min-w-0 flex-1 truncate text-neutral-900 hover:underline;
		}
		.qty {
			@apply rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700 tabular-nums;
		}
		.price {
			@apply text-neutral-600 tabular-nums;
		}
		.oos {
			@apply text-xs text-red-600;
		}
	}
</style>
