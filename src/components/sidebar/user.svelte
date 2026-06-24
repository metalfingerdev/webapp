<script lang="ts">
	import { useQuery, usePaginatedQuery, useMutation } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import { useSidebar } from '$lib/sidebar/sidebar.svelte.js';
	import type { Id } from '$convex/_generated/dataModel.js';
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/authentication/auth-flow.js';

	let expandedOrderId = $state<Id<'orders'> | null>(null);
	let error = $state<string | null>(null);
	let isAddingAddress = $state(false);
	let newAddress = $state({
		label: '',
		street: '',
		city: '',
		state: '',
		pincode: ''
	});

	const sidebar = useSidebar();
	const addresses = useQuery(api.profile.listMyAddresses);
	const ordersQuery = usePaginatedQuery(api.profile.listMyOrders, {}, { initialNumItems: 5 });
	const orderDetailQuery = useQuery(api.profile.getMyOrder, () =>
		expandedOrderId ? { id: expandedOrderId } : 'skip'
	);
	const removeAddress = useMutation(api.profile.removeAddress);
	const addAddress = useMutation(api.profile.addAddress);

	function toggleOrder(id: Id<'orders'>) {
		expandedOrderId = expandedOrderId === id ? null : id;
	}

	async function handleAddAddress(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		try {
			await addAddress(newAddress);
			isAddingAddress = false;
			newAddress = { label: '', street: '', city: '', state: '', pincode: '' };
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add address.';
		}
	}
	async function handleSignOut() {
		await signOut(authClient, (msg) => {
			error = msg;
		});
		sidebar.navigateTo(resolve('/'));
		sidebar.navigate('default');
	}
</script>

<div class="profile-container">
	<header>
		<button class="primary" onclick={() => sidebar.navigateTo(resolve('/user'))}
			>edit your profile</button
		>
	</header>

	<section>
		<div class="section-header">
			<h3>Saved Addresses</h3>
			<button class="secondary text-xs" onclick={() => (isAddingAddress = !isAddingAddress)}>
				{isAddingAddress ? 'Cancel' : 'Add New Address'}
			</button>
		</div>

		{#if isAddingAddress}
			<form class="address-form" onsubmit={handleAddAddress}>
				<input
					type="text"
					placeholder="Address Label (e.g., Home, Work)"
					bind:value={newAddress.label}
				/>
				<input type="text" placeholder="Street Address" bind:value={newAddress.street} required />
				<input type="text" placeholder="City" bind:value={newAddress.city} required />
				<input type="text" placeholder="State" bind:value={newAddress.state} required />
				<input type="text" placeholder="Pincode" bind:value={newAddress.pincode} required />
				<button type="submit" class="primary w-full mt-2">Save Address</button>
			</form>
		{/if}

		{#if addresses.data}
			{#if addresses.data.length === 0}
				<p class="status-text">No saved addresses found.</p>
			{:else}
				<div class="grid">
					{#each addresses.data as addr}
						<div class="card">
							<span class="address-tag">{addr.label || 'Address'}</span>
							<p class="address-details">{addr.street}</p>
							<p class="address-details">{addr.city}, {addr.state} - {addr.pincode}</p>

							<div class="card-actions">
								<button class="danger" onclick={() => removeAddress({ id: addr._id })}>
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<p class="status-text">Loading addresses...</p>
		{/if}
	</section>

	<section>
		<h3>Recent Orders</h3>

		{#if ordersQuery.status === 'LoadingFirstPage'}
			<p class="status-text">Loading orders...</p>
		{:else if ordersQuery.results.length === 0}
			<p class="status-text">You haven't placed any orders yet.</p>
		{:else}
			<div class="order-list">
				{#each ordersQuery.results as order}
					<div class="order-card">
						<button class="order-header" onclick={() => toggleOrder(order._id)}>
							<div>
								<span class="font-bold">Order ID:</span>
								<span class="font-mono">{order._id.slice(0, 8)}...</span>
							</div>
							<span class="status">{order.latestTracking?.status || order.status}</span>
							<span>{expandedOrderId === order._id ? '▲' : '▼'}</span>
						</button>

						{#if expandedOrderId === order._id}
							<div class="order-detail-expanded">
								{#if orderDetailQuery?.isLoading}
									<p class="status-text">Loading details...</p>
								{:else if orderDetailQuery?.data}
									<ul class="order-items">
										{#each orderDetailQuery.data.items as item}
											<li class="text-sm text-gray-600 flex justify-between">
												<span>{item.product?.name ?? 'Unknown Item'}</span>
												<span class="text-gray-400">x{item.quantity ?? 1}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if ordersQuery.status === 'CanLoadMore'}
				<button class="load-more" onclick={() => ordersQuery.loadMore(5)}>
					Load older orders
				</button>
			{/if}
		{/if}
	</section>

	{#if error}
		<p>{error}</p>
	{/if}

	<button onclick={handleSignOut}>Sign out</button>
</div>

<style lang="postcss">
	@reference "src/app.css";
</style>
