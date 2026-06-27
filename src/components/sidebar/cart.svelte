<script lang="ts">
	import { useSidebar } from '$lib/sidebar/index.js';
	import { useCheckout } from '$lib/checkout/checkout.svelte.js';
	import { useCart } from '$lib/cart/index.js';

	const sidebar = useSidebar();
	const checkout = useCheckout();
	const cart = useCart();

	const formatINR = (paise: number) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

	function goToCheckout() {
		// Hand off from the sidebar to the standalone checkout modal.
		sidebar.close();
		checkout.open();
	}
</script>

<!-- The dialog header (back/close) is owned by the host; this panel owns the
     cart title, list, and checkout footer. Styling lives in the Tailwind block
     below — mirrors the token palette in auth.svelte. -->
<section class="cart">
	<header class="cart-header">
		<h2>Cart</h2>
		<span class="count">({cart.totalItemsCount})</span>
	</header>

	<div class="cart-content">
		{#if cart.isEmpty}
			<p class="empty-message">Your cart is empty.</p>
		{:else}
			<div class="cart-list">
				{#each cart.items as item (item.productId)}
					<div class="cart-item">
						<div class="item-info">
							<span class="item-name">{item.name}</span>
							{#if item.category}
								<span class="item-badge">{item.category}</span>
							{/if}
						</div>

						<span class="price">{formatINR(item.price * item.quantity)}</span>

						<div class="controls">
							<button
								class="qty"
								disabled={cart.isPurchasing}
								onclick={() => cart.changeQuantity(item.productId, -1)}
								aria-label="Decrease quantity">-</button
							>
							<span class="qty-value">{item.quantity}</span>
							<button
								class="qty"
								disabled={cart.isPurchasing || item.quantity >= item.stock}
								onclick={() => cart.changeQuantity(item.productId, 1)}
								aria-label="Increase quantity">+</button
							>

							{#if item.quantity >= item.stock}
								<span class="stock-warning">Only {item.stock} left</span>
							{/if}
						</div>
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
					<p class="error-text" role="alert">
						Error: {cart.error}
					</p>
				{/if}
			</div>
		{/if}
	</div>
</section>

<style lang="postcss">
	@reference "src/app.css";
	/* Local design tokens — shared palette with auth.svelte so the sidebar
	   panels stay visually consistent (neutral oklch + color-mix states). */
	.cart {
		--radius: 0.65rem;
		--bg: oklch(1 0 0);
		--fg: oklch(0.21 0 0);
		--muted-fg: oklch(0.55 0 0);
		--border: oklch(0.92 0 0);
		--primary: oklch(0.21 0 0);
		--primary-fg: oklch(0.98 0 0);
		--ring: oklch(0.71 0 0);
		--destructive: oklch(0.58 0.22 27);

		@apply flex h-full flex-col gap-6 p-8 text-(--fg);
	}

	.cart-header {
		@apply flex items-baseline gap-2;

		h2 {
			@apply text-2xl leading-[1.15] font-semibold tracking-[-0.015em];
		}

		.count {
			@apply text-sm text-(--muted-fg);
		}
	}

	.cart-content {
		@apply flex min-h-0 flex-1 flex-col;
	}

	.empty-message {
		@apply m-0 text-sm text-(--muted-fg);
	}

	.cart-list {
		@apply -mr-2 flex flex-1 flex-col gap-4 overflow-y-auto pr-2;
	}

	.cart-item {
		@apply grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-(--border) pb-4;
	}

	.item-info {
		@apply flex min-w-0 flex-col gap-0.5;
	}

	.item-name {
		@apply truncate text-sm font-medium;
	}

	.item-badge {
		@apply text-xs text-(--muted-fg);
	}

	.price {
		@apply text-right text-sm font-medium tabular-nums;
	}

	.controls {
		@apply col-span-2 flex items-center gap-2;

		.qty {
			@apply inline-flex size-7 cursor-pointer items-center justify-center rounded-(--radius) border border-(--border) bg-(--bg) text-sm leading-none text-(--fg) transition-colors duration-120 ease-[ease];

			&:not(:disabled):hover {
				@apply bg-[color-mix(in_oklab,var(--fg)_5%,var(--bg))];
			}

			&:disabled {
				@apply cursor-not-allowed opacity-[0.55];
			}
		}

		.qty-value {
			@apply min-w-5 text-center text-sm tabular-nums;
		}
	}

	.stock-warning {
		@apply ml-auto text-xs text-(--destructive);
	}

	.cart-footer {
		@apply mt-auto grid gap-3 border-t border-(--border) pt-4;
	}

	.total-row {
		@apply flex items-center justify-between text-sm font-medium;
	}

	.checkout-btn {
		@apply inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius) border border-transparent bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-fg) transition-[background-color,opacity] duration-120 ease-[ease];

		&:not(:disabled):hover {
			@apply bg-[color-mix(in_oklab,var(--primary)_88%,white)];
		}

		&:disabled {
			@apply cursor-not-allowed opacity-[0.55];
		}
	}

	.error-text {
		@apply m-0 text-sm text-(--destructive);
	}
</style>
