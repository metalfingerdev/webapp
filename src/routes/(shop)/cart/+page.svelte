<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/ui/Button.svelte';
	import CartList from '#lib/store/CartList.svelte';
	import CartSummary from '#lib/store/CartSummary.svelte';
	import { useCart } from '#lib/store/cart.svelte.js';
	import { strings } from '#lib/store/strings.js';

	const cart = useCart();
	const text = strings.cart;
</script>

<svelte:head><title>{text.title} · {strings.brand}</title></svelte:head>

<h1 class="title">{text.title}</h1>
{#if cart.loading}
	<p class="note">{strings.menu.loading}</p>
{:else if cart.count === 0}
	<p class="note">{text.empty} {text.emptyHint}</p>
	<Button href={resolve('/(shop)/shop')} variant="primary">{text.browse}</Button>
{:else}
	<div class="layout">
		<div><CartList /></div>
		<aside class="side"><CartSummary /></aside>
	</div>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply mb-4 text-3xl font-extrabold;
	}

	.note {
		@apply mb-4 text-text-muted;
	}

	.layout {
		@apply grid gap-6 md:grid-cols-[1fr_20rem];
	}

	.side {
		@apply h-fit panel p-4 md:sticky md:top-28;
	}
</style>
