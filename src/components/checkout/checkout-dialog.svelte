<script lang="ts">
	// src/components/checkout/checkout-dialog.svelte
	import { useCheckout } from '$lib/checkout/checkout.svelte.js';
	import { useCart } from '$lib/cart/index.js';
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { paymentUIState } from '$lib/razorpay/gateway.svelte.js';
	import AddressStep from './address-step.svelte';
	import PaymentGateway from './payment-gateway.svelte';

	const checkout = useCheckout();
	const cart = useCart();
	const sidebar = useSidebar();

	let dialog = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialog) return;
		if (checkout.isOpen && !dialog.open) dialog.showModal();
		else if (!checkout.isOpen && dialog.open) dialog.close();
	});

	function onCancel(e: Event) {
		if (cart.isPurchasing) e.preventDefault();
	}

	function viewOrders() {
		checkout.close();
		sidebar.show('user');
	}
</script>

<dialog
	bind:this={dialog}
	class="checkout-modal"
	oncancel={onCancel}
	onclose={() => checkout.close()}
>
	{#if checkout.step === 'success'}
		<div class="panel success">
			<h2>Order placed</h2>
			{#if checkout.lastOrderId}
				<p class="order-id">Order #{checkout.lastOrderId.slice(0, 8)}</p>
			{/if}
			<p class="muted">Thanks — your order is confirmed.</p>
			<div class="actions">
				<button class="primary" onclick={viewOrders}>View orders</button>
				<button class="secondary" onclick={() => checkout.close()}>Done</button>
			</div>
		</div>
	{:else if paymentUIState.isOpen}
		<PaymentGateway />
	{:else}
		<div class="panel">
			{#if !cart.isPurchasing}
				<button class="close" onclick={() => checkout.close()} aria-label="Close checkout">×</button
				>
			{/if}
			<AddressStep />
		</div>
	{/if}
</dialog>

<style lang="postcss">
	@reference 'src/app.css';

	.checkout-modal {
		@apply m-auto w-[calc(100%-2rem)] max-w-md squircle-4xl bg-white p-0 shadow-xl;
		max-height: 85vh;
		overflow: auto;

		&::backdrop {
			@apply bg-black/40;
		}
	}

	.panel {
		@apply relative p-6;
	}

	.close {
		@apply absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-neutral-500 hover:bg-neutral-100;
	}

	.success {
		@apply flex flex-col items-center gap-2 text-center;

		h2 {
			@apply text-lg font-semibold text-neutral-900;
		}

		.order-id {
			@apply font-mono text-sm text-neutral-500;
		}

		.muted {
			@apply text-sm text-neutral-500;
		}

		.actions {
			@apply mt-4 flex gap-2;
		}
	}
</style>
