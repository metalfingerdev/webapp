<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/ui/Button.svelte';
	import CartList from '#lib/store/CartList.svelte';
	import CartSummary from '#lib/store/CartSummary.svelte';
	import { useCart } from '#lib/store/cart.svelte.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';

	const cart = useCart();
	const text = strings.cart;
</script>

<svelte:head><title>{text.title} · {strings.brand}</title></svelte:head>

<PageHead title={text.title} />
<div class="cart">
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
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.cart {
		@apply flex flex-col items-start gap-4;

		p.note {
			@apply text-text-muted;
		}
		div.layout {
			@apply grid w-full items-start gap-8 md:grid-cols-[1fr_22rem];
		}
		aside.side {
			@apply rounded-[1.75rem] raised p-5 md:sticky md:top-28;
		}
	}
</style>
