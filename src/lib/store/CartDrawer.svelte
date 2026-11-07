<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/ui/Button.svelte';
	import CartList from './CartList.svelte';
	import CartSummary from './CartSummary.svelte';
	import Drawer from './Drawer.svelte';
	import { useCart } from './cart.svelte.js';
	import { strings } from './strings.js';

	// From the right: opened by the bar's cart button and after "Add to cart"
	const cart = useCart();
	const text = strings.cart;
</script>

<Drawer bind:open={cart.open} side="right" title={text.title} closeLabel={strings.nav.close}>
	{#snippet head()}<span class="title">{text.title}</span>{/snippet}
	{#if cart.loading}
		<p class="note">{strings.menu.loading}</p>
	{:else if cart.count === 0}
		<p class="note">{text.empty}</p>
		<p class="note">{text.emptyHint}</p>
		<Button href={resolve('/(shop)/shop')} onclick={() => (cart.open = false)} variant="primary">
			{text.browse}
		</Button>
	{:else}
		<CartList />
		<div class="foot">
			<CartSummary />
			<Button href={resolve('/(shop)/cart')} block onclick={() => (cart.open = false)}>
				{text.viewCart}
			</Button>
		</div>
	{/if}
</Drawer>

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply pl-2 text-lg font-extrabold;
	}

	.note {
		@apply mb-3 text-text-muted;
	}

	.foot {
		@apply flex flex-col gap-2 border-t border-border-muted pt-3;
	}
</style>
