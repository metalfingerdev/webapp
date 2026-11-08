<script lang="ts">
	import { resolve } from '$app/paths';
	import { useCart } from './cart.svelte.js';
	import Button from '#lib/ui/Button.svelte';
	import { formatPrice } from './format.js';
	import { strings } from './strings.js';

	// Subtotal and the checkout button, under the list. Checkout itself is step 5.
	let { onclear }: { onclear?: () => void } = $props();
	const cart = useCart();
	const text = strings.cart;
</script>

<div class="summary">
	<div class="row">
		<span>{text.subtotal}</span>
		<strong class="amount">{formatPrice(cart.view?.subtotal ?? 0)}</strong>
	</div>
	<p class="note">{text.shippingNote} {strings.product.inclusiveOfTax}.</p>
	<Button variant="primary" large block href={resolve('/(shop)/checkout')}>
		{text.checkout}
	</Button>
	<button class="clear" type="button" onclick={() => (cart.clear(), onclear?.())}>
		{text.clear}
	</button>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.summary {
		@apply flex flex-col gap-2;
	}

	.row {
		@apply flex items-baseline justify-between;
	}

	.amount {
		@apply text-2xl tabular-nums;
	}

	.note {
		@apply text-sm text-text-muted;
	}

	.clear {
		@apply min-h-11 self-start text-sm font-bold text-danger;
	}
</style>
