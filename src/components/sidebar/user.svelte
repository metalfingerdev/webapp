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
		sidebar.exit(resolve('/'));
	}
</script>

<div class="profile-container">
	<header>
		<button class="primary w-full" onclick={() => sidebar.exit(resolve('/user'))}
			>Edit your profile</button
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
											<li class="flex justify-between text-sm">
												<span>{item.product?.name ?? 'Unknown Item'}</span>
												<span class="text-(--muted-fg)">x{item.quantity ?? 1}</span>
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
		<p class="error-text" role="alert">{error}</p>
	{/if}

	<button class="signout" onclick={handleSignOut}>Sign out</button>
</div>

<style lang="postcss">
	@reference "src/app.css";
	/* Local design tokens — shared palette with auth.svelte / cart.svelte so the
	   sidebar panels stay visually consistent (neutral oklch + color-mix states). */
	.profile-container {
		--radius: 0.65rem;
		--bg: oklch(1 0 0);
		--fg: oklch(0.21 0 0);
		--muted-fg: oklch(0.55 0 0);
		--border: oklch(0.92 0 0);
		--primary: oklch(0.21 0 0);
		--primary-fg: oklch(0.98 0 0);
		--ring: oklch(0.71 0 0);
		--destructive: oklch(0.58 0.22 27);

		@apply flex h-full flex-col gap-6 overflow-y-auto p-8 text-(--fg);

		section {
			@apply grid gap-3;
		}

		h3 {
			@apply m-0 text-xs font-semibold tracking-wide text-(--muted-fg) uppercase;
		}
	}

	.section-header {
		@apply flex items-center justify-between gap-2;
	}

	/* ── Buttons ──────────────────────────────────────────────────────────── */
	.primary {
		@apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--radius) border border-transparent bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-fg) transition-colors duration-120 ease-[ease];

		&:not(:disabled):hover {
			@apply bg-[color-mix(in_oklab,var(--primary)_88%,white)];
		}

		&:disabled {
			@apply cursor-not-allowed opacity-[0.55];
		}
	}

	.secondary,
	.signout {
		@apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors duration-120 ease-[ease];

		&:not(:disabled):hover {
			@apply bg-[color-mix(in_oklab,var(--fg)_5%,var(--bg))];
		}
	}

	.signout {
		@apply mt-auto w-full;
	}

	.danger {
		@apply inline-flex cursor-pointer items-center justify-center rounded-(--radius) px-2 py-1 text-xs font-medium text-(--destructive) transition-colors duration-120 ease-[ease];

		&:not(:disabled):hover {
			@apply bg-[color-mix(in_oklab,var(--destructive)_10%,var(--bg))];
		}
	}

	/* ── Address form ─────────────────────────────────────────────────────── */
	.address-form {
		@apply grid gap-2;

		input {
			@apply w-full rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition-[border-color,box-shadow] duration-120 ease-[ease];

			&::placeholder {
				@apply text-[color-mix(in_oklab,var(--muted-fg)_65%,transparent)];
			}

			&:focus-visible {
				@apply border-(--ring) shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_30%,transparent)] outline-none;
			}
		}
	}

	.status-text {
		@apply m-0 text-sm text-(--muted-fg);
	}

	/* ── Saved addresses ──────────────────────────────────────────────────── */
	.grid {
		@apply grid gap-3;
	}

	.card {
		@apply grid gap-1 rounded-(--radius) border border-(--border) p-3;
	}

	.address-tag {
		@apply text-sm font-medium;
	}

	.address-details {
		@apply m-0 text-sm text-(--muted-fg);
	}

	.card-actions {
		@apply mt-1 flex justify-end;
	}

	/* ── Orders ───────────────────────────────────────────────────────────── */
	.order-list {
		@apply grid gap-2;
	}

	.order-card {
		@apply overflow-hidden rounded-(--radius) border border-(--border);
	}

	.order-header {
		@apply flex w-full cursor-pointer items-center justify-between gap-2 bg-(--bg) px-3 py-2 text-sm text-(--fg) transition-colors duration-120 ease-[ease];

		&:hover {
			@apply bg-[color-mix(in_oklab,var(--fg)_4%,var(--bg))];
		}

		.status {
			@apply ml-auto rounded-full bg-[color-mix(in_oklab,var(--fg)_6%,var(--bg))] px-2 py-0.5 text-xs text-(--muted-fg);
		}
	}

	.order-detail-expanded {
		@apply border-t border-(--border) px-3 py-2;
	}

	.order-items {
		@apply m-0 grid list-none gap-1 p-0;
	}

	.load-more {
		@apply inline-flex w-full cursor-pointer items-center justify-center rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm font-medium text-(--fg) transition-colors duration-120 ease-[ease];

		&:hover {
			@apply bg-[color-mix(in_oklab,var(--fg)_5%,var(--bg))];
		}
	}

	.error-text {
		@apply m-0 text-sm text-(--destructive);
	}
</style>
