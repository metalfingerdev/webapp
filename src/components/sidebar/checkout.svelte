<script lang="ts">
	import { useQuery, useMutation } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useCart } from '$lib/cart/index.js';
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import { useAuth } from '$lib/svelte/client.svelte.js';
	import { AddressStorage } from '$lib/cart/address-storage.js';
	import type { Id } from '$convex/_generated/dataModel.js';

	const auth = useAuth();
	const cart = useCart();
	const sidebar = useSidebar();

	const addresses = useQuery(api.addresses.getMyAddresses);
	const addAddress = useMutation(api.addresses.addAddress);

	let selectedAddressId = $state<Id<'addresses'> | undefined>(undefined);
	let isAddingAddress = $state(false);
	let newAddress = $state({ label: '', street: '', city: '', state: '', pincode: '' });

	// FIX: Guard against the effect firing multiple times if auth state flickers
	let pendingAddressSaved = false;

	$effect(() => {
		if (auth.isAuthenticated && !pendingAddressSaved) {
			const pending = AddressStorage.load();
			if (pending) {
				pendingAddressSaved = true;
				addAddress(pending)
					.then((id) => {
						selectedAddressId = id;
						AddressStorage.clear();
					})
					.catch((err) => {
						pendingAddressSaved = false;
						console.error('Auto-save failed:', err);
					});
			}
		}
	});

	async function handleAddAddress(e: SubmitEvent) {
		e.preventDefault();

		if (!auth.isAuthenticated) {
			AddressStorage.save(newAddress);
			sidebar.openAuth(() => {
				sidebar.navigate('checkout');
			});
			return;
		}

		try {
			const newId = await addAddress(newAddress);
			selectedAddressId = newId;
			isAddingAddress = false;
			newAddress = { label: '', street: '', city: '', state: '', pincode: '' };
		} catch (err) {
			console.error('Failed to add address:', err);
		}
	}

	async function handleCheckout() {
		if (!selectedAddressId) return;
		// FIX: Don't navigate to payment here. service.svelte.ts now calls
		// onReadyForPayment() inside processCheckout, after stock is validated.
		// This means a stock error keeps the user here where cart.error is visible.
		await cart.checkout(selectedAddressId);
	}
</script>

<div class="checkout-container">
	<div class="section-header">
		<h2>Shipping Address</h2>
		<button class="secondary text-xs" onclick={() => (isAddingAddress = !isAddingAddress)}>
			{isAddingAddress ? 'Cancel' : '+ Add New'}
		</button>
	</div>

	{#if isAddingAddress}
		<form class="address-form" onsubmit={handleAddAddress}>
			<input type="text" placeholder="Label (Home/Work)" bind:value={newAddress.label} />
			<input type="text" placeholder="Street" bind:value={newAddress.street} required />
			<input type="text" placeholder="City" bind:value={newAddress.city} required />
			<input type="text" placeholder="State" bind:value={newAddress.state} required />
			<input type="text" placeholder="Pincode" bind:value={newAddress.pincode} required />
			<button type="submit" class="primary w-full mt-2">Save Address</button>
		</form>
	{/if}

	{#if addresses.isLoading}
		<div class="loading-state">Loading addresses...</div>
	{:else if addresses.data && addresses.data.length > 0}
		<div class="address-list">
			{#each addresses.data as address}
				<button
					class="address-card"
					class:selected={selectedAddressId === address._id}
					onclick={() => (selectedAddressId = address._id)}
				>
					<span class="street">{address.street}</span>
					<span class="city">{address.city}, {address.pincode}</span>
				</button>
			{/each}
		</div>
	{:else if !isAddingAddress}
		<div class="empty-state">
			<p>No addresses found. Please add an address to continue.</p>
		</div>
	{/if}

	<!-- FIX: Show checkout/stock errors here where the user can see them -->
	{#if cart.error}
		<p class="error-text">{cart.error}</p>
	{/if}

	<div class="checkout-footer">
		<button
			class="checkout-btn"
			disabled={!selectedAddressId || cart.isPurchasing}
			onclick={handleCheckout}
		>
			{#if cart.isPurchasing}
				Processing...
			{:else}
				Confirm & Pay
			{/if}
		</button>
	</div>
</div>

<style lang="postcss">
	@reference 'src/app.css';
</style>
