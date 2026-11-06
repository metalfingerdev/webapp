<script lang="ts">
	import { paymentUIState, closeGateway } from '$lib/razorpay/gateway.svelte.js';

	let selectedMethod = $state('upi');
	let isPaying = $state(false);

	let formattedAmount = $derived(
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
			paymentUIState.amount / 100
		)
	);

	function handlePayment() {
		isPaying = true;
		// Unblocks processor.charge() → chargeAction → confirmOrder
		closeGateway(true);
		// No need to reset isPaying: component unmounts when sidebar navigates away
	}

	function handleCancel() {
		closeGateway(false);
	}
</script>

<div class="gateway-container">
	<header class="gateway-header">
		<div class="brand">
			<div class="logo">⚡</div>
			<span>MockPay Gateway</span>
		</div>
		<button class="close-btn" onclick={handleCancel}>×</button>
	</header>

	{#if paymentUIState.isLoading}
		<div class="gateway-loading">
			<div class="spinner"></div>
			<span>Preparing secure payment…</span>
		</div>
	{:else}
		<div class="gateway-body">
			<nav class="methods-sidebar">
				<button class:active={selectedMethod === 'upi'} onclick={() => (selectedMethod = 'upi')}>
					📱 UPI / Venmo
				</button>
				<button class:active={selectedMethod === 'card'} onclick={() => (selectedMethod = 'card')}>
					💳 Credit / Debit Card
				</button>
				<button
					class:active={selectedMethod === 'netbanking'}
					onclick={() => (selectedMethod = 'netbanking')}
				>
					🏦 Netbanking
				</button>
			</nav>

			<div class="payment-details">
				<div class="amount-display">
					<span class="label">Amount to Pay</span>
					<span class="value">{formattedAmount}</span>
				</div>

				<button class="pay-btn" onclick={handlePayment} disabled={isPaying}>
					{isPaying ? 'Processing...' : `Pay ${formattedAmount}`}
				</button>
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';
	.gateway-container {
		@apply flex h-full w-full flex-col overflow-hidden bg-white;
	}
	.gateway-header {
		@apply flex justify-between bg-gray-900 p-4 text-white;
	}
	.gateway-body {
		@apply flex flex-1 overflow-y-auto;
	}
	.gateway-loading {
		@apply flex flex-1 flex-col items-center justify-center gap-4 p-6 text-sm font-medium text-gray-600;
	}
	.spinner {
		@apply h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-600;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.methods-sidebar {
		@apply flex w-1/3 flex-col border-r bg-gray-50 p-2;
	}
	.methods-sidebar button {
		@apply mb-1 rounded px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-200;
	}
	.methods-sidebar button.active {
		@apply border-l-4 border-blue-600 bg-white shadow-sm;
	}
	.payment-details {
		@apply flex w-2/3 flex-col p-6;
	}
	.amount-display {
		@apply mb-6 rounded-lg bg-blue-50 p-4 text-center;
	}
	.pay-btn {
		@apply w-full rounded bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50;
	}
</style>
