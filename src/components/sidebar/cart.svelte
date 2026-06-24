<script lang="ts">
	import { useSidebar } from '$lib/sidebar/index.js';
	import { useCart } from '$lib/cart/index.js';

	const sidebar = useSidebar();
	const cart = useCart();

	const formatINR = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

	function goToCheckout() {
		sidebar.navigate('checkout'); // Just open the view
	}
</script>

<header class="cart-header">
	<span>({cart.totalItemsCount})</span>
</header>

<div class="cart-content">
	{#if cart.isEmpty}
		<p class="empty-message">Empty</p>
	{:else}
		<div class="cart-list">
			{#each cart.items as item (item.productId)}
				<div class="cart-item">
					<div class="item-info">
						<span class="item-name">{item.name}</span>
						{#if item.category}
							<span class="item-badge">[{item.category}]</span>
						{/if}
					</div>

					<div class="controls">
						<button
							disabled={cart.isPurchasing}
							onclick={() => cart.changeQuantity(item.productId, -1)}>-</button
						>
						<span>{item.quantity}</span>
						<button
							disabled={cart.isPurchasing || item.quantity >= item.stock}
							onclick={() => cart.changeQuantity(item.productId, 1)}>+</button
						>

						{#if item.quantity >= item.stock}
							<span class="stock-warning">Only {item.stock} left</span>
						{/if}
					</div>

					<span class="price">{formatINR(item.price * item.quantity)}</span>
				</div>
			{/each}
		</div>

		<div class="cart-footer">
			<div class="total-row">
				<span>Total</span>
				<span>{formatINR(cart.total)}</span>
			</div>

			<button class="checkout-btn" disabled={cart.isPurchasing} onclick={goToCheckout}>
				Checkout
			</button>

			{#if cart.error}
				<p class="error-text">
					Error: {cart.error}
				</p>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference "src/app.css";
</style>
