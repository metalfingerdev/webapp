<script lang="ts">
	import { api } from '$convex/_generated/api.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import { useQuery, useMutation, usePaginatedQuery, useAction } from 'convex-svelte';
	import { ConvexError } from 'convex/values';
	import type { Id } from '$convex/_generated/dataModel.js';

	let expandedOrderId = $state<Id<'orders'> | null>(null);
	let name = $state('');
	let image = $state('');
	let newCity = $state('');
	let username = $state('');
	let newLabel = $state('');
	let newState = $state('');
	let newStreet = $state('');
	let newPincode = $state('');

	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordPending = $state(false);
	let passwordFeedback = $state<{ type: 'success' | 'error'; msg: string } | null>(null);

	let isSaving = $state(false);
	let imageError = $state(false);
	let addPending = $state(false);
	let updatePending = $state(false);
	let removePending = $state(false);
	let showAddressForm = $state(false);
	let addrFeedback = $state<{ type: 'success' | 'error'; msg: string } | null>(null);
	let profileFeedback = $state<{ type: 'success' | 'error'; msg: string } | null>(null);
	let editingAddress = $state<null | {
		id: Id<'addresses'>;
		label: string;
		street: string;
		city: string;
		state: string;
		pincode: string;
	}>(null);

	const userQuery = useQuery(api.auth.getCurrentUser);
	const authMethodsQuery = useQuery(api.auth.myAuthMethods);
	const setPassword = useAction(api.auth.setMyPassword);
	const addAddress = useMutation(api.profile.addAddress);
	const addressesQuery = useQuery(api.profile.listMyAddresses);
	const updateAddress = useMutation(api.profile.updateAddress);
	const removeAddress = useMutation(api.profile.removeAddress);
	const ordersQuery = usePaginatedQuery(api.profile.listMyOrders, {}, { initialNumItems: 5 });
	const orderDetailQuery = $derived(
		expandedOrderId ? useQuery(api.profile.getMyOrder, { id: expandedOrderId }) : null
	);

	$effect(() => {
		if (userQuery.data) {
			name = userQuery.data.name || '';
			image = userQuery.data.image || '';
			username = ((userQuery.data as Record<string, unknown>).username as string) || '';
		}
	});

	$effect(() => {
		if (image) imageError = false;
	});

	async function handleUpdateProfile(e: SubmitEvent) {
		e.preventDefault();
		isSaving = true;
		profileFeedback = null;
		try {
			await authClient.updateUser({ name, image, ...(username ? { username } : {}) });
			profileFeedback = { type: 'success', msg: 'Profile updated.' };
		} catch (error) {
			profileFeedback = {
				type: 'error',
				msg: error instanceof Error ? error.message : 'Update failed.'
			};
		} finally {
			isSaving = false;
		}
	}

	async function handleSetPassword(e: SubmitEvent) {
		e.preventDefault();
		passwordFeedback = null;
		if (newPassword.length < 8) {
			passwordFeedback = { type: 'error', msg: 'Password must be at least 8 characters.' };
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordFeedback = { type: 'error', msg: 'Passwords do not match.' };
			return;
		}
		passwordPending = true;
		try {
			await setPassword({ newPassword });
			passwordFeedback = {
				type: 'success',
				msg: 'Password set. You can now sign in with email and password too.'
			};
			newPassword = confirmPassword = '';
		} catch (error) {
			passwordFeedback = {
				type: 'error',
				msg:
					error instanceof ConvexError
						? String(error.data)
						: error instanceof Error
							? error.message
							: 'Failed to set password.'
			};
		} finally {
			passwordPending = false;
		}
	}

	function startEditAddress(addr: NonNullable<typeof addressesQuery.data>[number]) {
		editingAddress = {
			id: addr._id,
			label: addr.label ?? '',
			street: addr.street,
			city: addr.city,
			state: addr.state,
			pincode: addr.pincode
		};
		showAddressForm = false;
	}

	async function handleAddAddress(e: SubmitEvent) {
		e.preventDefault();
		addrFeedback = null;
		addPending = true;
		try {
			await addAddress({
				...(newLabel ? { label: newLabel } : {}),
				street: newStreet,
				city: newCity,
				state: newState,
				pincode: newPincode
			});
			addrFeedback = { type: 'success', msg: 'Address added.' };
			newLabel = newStreet = newCity = newState = newPincode = '';
			showAddressForm = false;
		} catch (error) {
			addrFeedback = {
				type: 'error',
				msg: error instanceof Error ? error.message : 'Failed to add.'
			};
		} finally {
			addPending = false;
		}
	}

	async function handleUpdateAddress(e: SubmitEvent) {
		e.preventDefault();
		if (!editingAddress) return;
		addrFeedback = null;
		updatePending = true;
		try {
			await updateAddress({
				id: editingAddress.id,
				...(editingAddress.label ? { label: editingAddress.label } : {}),
				street: editingAddress.street,
				city: editingAddress.city,
				state: editingAddress.state,
				pincode: editingAddress.pincode
			});
			addrFeedback = { type: 'success', msg: 'Address updated.' };
			editingAddress = null;
		} catch (error) {
			addrFeedback = {
				type: 'error',
				msg: error instanceof Error ? error.message : 'Failed to update.'
			};
		} finally {
			updatePending = false;
		}
	}

	async function handleRemoveAddress(id: Id<'addresses'>) {
		addrFeedback = null;
		removePending = true;
		try {
			await removeAddress({ id });
			addrFeedback = { type: 'success', msg: 'Address removed.' };
		} catch (error) {
			addrFeedback = {
				type: 'error',
				msg: error instanceof Error ? error.message : 'Failed to remove.'
			};
		} finally {
			removePending = false;
		}
	}

	// ─── Orders ───────────────────────────────────────────────────────────────

	function toggleOrder(id: Id<'orders'>) {
		expandedOrderId = expandedOrderId === id ? null : id;
	}
</script>

<main class="profile-panel">
	{#if userQuery.isLoading}
		<p class="status-msg">Loading...</p>
	{:else if userQuery.error}
		<p class="status-msg error">{userQuery.error.message}</p>
	{:else if !userQuery.data}
		<p class="status-msg error">No active session. Please log in.</p>
	{:else}
		<!-- ─── Profile ─────────────────────────────────────────────────────── -->
		<section class="panel-section">
			<header class="section-header">
				<h2>Account Settings</h2>
				<span class="user-id">ID: <code>{userQuery.data._id}</code></span>
			</header>

			<form onsubmit={handleUpdateProfile} class="utility-form">
				<div class="input-row">
					<label for="name">Display Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						placeholder="Enter display name"
						required
					/>
				</div>

				<div class="input-row">
					<label for="username">Username</label>
					<input type="text" id="username" bind:value={username} placeholder="Enter username" />
				</div>

				<div class="input-row">
					<label for="image">Avatar URL</label>
					<div class="avatar-input-group">
						<input
							type="text"
							id="image"
							bind:value={image}
							placeholder="https://example.com/avatar.png"
						/>
						{#if image && !imageError}
							<img
								src={image}
								alt="Preview"
								class="inline-preview"
								onerror={() => (imageError = true)}
							/>
						{/if}
					</div>
				</div>

				<div class="action-row">
					<button type="submit" class="save-btn" disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</button>
				</div>

				{#if profileFeedback}
					<p class="feedback-banner {profileFeedback.type}">{profileFeedback.msg}</p>
				{/if}
			</form>
		</section>

		<hr class="divider" />

		<!-- ─── Password ────────────────────────────────────────────────────── -->
		<section class="panel-section">
			<header class="section-header">
				<h2>Password</h2>
			</header>

			{#if authMethodsQuery.isLoading}
				<p class="status-msg">Loading...</p>
			{:else if authMethodsQuery.data?.hasPassword}
				<p class="status-msg">
					Your account has a password — you can sign in with email and password.
				</p>
			{:else}
				<p class="status-msg">
					{authMethodsQuery.data?.hasGoogle ? 'You currently sign in with Google. ' : ''}Add a
					password to also sign in with your email.
				</p>
				<form onsubmit={handleSetPassword} class="utility-form">
					<div class="input-row">
						<label for="new-password">New Password</label>
						<input
							type="password"
							id="new-password"
							bind:value={newPassword}
							placeholder="At least 8 characters"
							autocomplete="new-password"
							minlength="8"
							required
						/>
					</div>
					<div class="input-row">
						<label for="confirm-password">Confirm Password</label>
						<input
							type="password"
							id="confirm-password"
							bind:value={confirmPassword}
							placeholder="Re-enter password"
							autocomplete="new-password"
							minlength="8"
							required
						/>
					</div>
					<div class="action-row">
						<button type="submit" class="save-btn" disabled={passwordPending}>
							{passwordPending ? 'Setting...' : 'Set Password'}
						</button>
					</div>
					{#if passwordFeedback}
						<p class="feedback-banner {passwordFeedback.type}">{passwordFeedback.msg}</p>
					{/if}
				</form>
			{/if}
		</section>

		<hr class="divider" />

		<!-- ─── Addresses ───────────────────────────────────────────────────── -->
		<section class="panel-section">
			<header class="section-header">
				<h2>Saved Addresses</h2>
				<button
					type="button"
					class="add-btn"
					onclick={() => {
						showAddressForm = !showAddressForm;
						editingAddress = null;
					}}
				>
					{showAddressForm ? 'Cancel' : '+ Add Address'}
				</button>
			</header>

			{#if addrFeedback}
				<p class="feedback-banner {addrFeedback.type}">{addrFeedback.msg}</p>
			{/if}

			{#if showAddressForm}
				<form onsubmit={handleAddAddress} class="address-form">
					<div class="input-row">
						<label for="new-label">Label</label>
						<input type="text" id="new-label" bind:value={newLabel} placeholder="e.g. Home" />
					</div>
					<div class="input-row">
						<label for="new-street">Street</label>
						<input
							type="text"
							id="new-street"
							bind:value={newStreet}
							placeholder="Street"
							required
						/>
					</div>
					<div class="addr-row">
						<div class="input-row">
							<label for="new-city">City</label>
							<input type="text" id="new-city" bind:value={newCity} placeholder="City" required />
						</div>
						<div class="input-row">
							<label for="new-state">State</label>
							<input
								type="text"
								id="new-state"
								bind:value={newState}
								placeholder="State"
								required
							/>
						</div>
						<div class="input-row pincode">
							<label for="new-pincode">Pincode</label>
							<input
								type="text"
								id="new-pincode"
								bind:value={newPincode}
								placeholder="Pincode"
								required
							/>
						</div>
					</div>
					<div class="action-row">
						<button type="submit" class="save-btn" disabled={addPending}>
							{addPending ? 'Saving...' : 'Save Address'}
						</button>
					</div>
				</form>
			{/if}

			{#if addressesQuery.isLoading}
				<p class="status-msg">Loading addresses...</p>
			{:else if !addressesQuery.data?.length}
				<p class="status-msg">No saved addresses.</p>
			{:else}
				<ul class="address-list">
					{#each addressesQuery.data as addr (addr._id)}
						<li class="address-item">
							{#if editingAddress?.id === addr._id}
								<form onsubmit={handleUpdateAddress} class="address-form">
									<div class="input-row">
										<label for="label">Label</label>
										<input type="text" bind:value={editingAddress.label} placeholder="Label" />
									</div>
									<div class="input-row">
										<label for="street">Street</label>
										<input
											type="text"
											bind:value={editingAddress.street}
											placeholder="Street"
											required
										/>
									</div>
									<div class="addr-row">
										<div class="input-row">
											<label for="city">City</label>
											<input
												type="text"
												bind:value={editingAddress.city}
												placeholder="City"
												required
											/>
										</div>
										<div class="input-row">
											<label for="state">State</label>
											<input
												type="text"
												bind:value={editingAddress.state}
												placeholder="State"
												required
											/>
										</div>
										<div class="input-row pincode">
											<label for="pincode">Pincode</label>
											<input
												type="text"
												bind:value={editingAddress.pincode}
												placeholder="Pincode"
												required
											/>
										</div>
									</div>

									<div class="action-row">
										<button type="submit" class="save-btn" disabled={updatePending}>
											{updatePending ? 'Saving...' : 'Update'}
										</button>
										<button type="button" class="cancel-btn" onclick={() => (editingAddress = null)}
											>Cancel</button
										>
									</div>
								</form>
							{:else}
								<div class="address-display">
									<div class="address-text">
										{#if addr.label}<strong>{addr.label}</strong> —
										{/if}
										{addr.street}, {addr.city}, {addr.state}
										{addr.pincode}
									</div>
									<div class="address-actions">
										<button type="button" onclick={() => startEditAddress(addr)}>Edit</button>
										<button
											type="button"
											disabled={removePending}
											onclick={() => handleRemoveAddress(addr._id)}>Remove</button
										>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<hr class="divider" />

		<!-- ─── Orders ──────────────────────────────────────────────────────── -->
		<section class="panel-section">
			<header class="section-header">
				<h2>Order History</h2>
			</header>

			{#if ordersQuery.isLoading}
				<p class="status-msg">Loading orders...</p>
			{:else if !ordersQuery.results.length}
				<p class="status-msg">No orders yet.</p>
			{:else}
				<ul class="order-list">
					{#each ordersQuery.results as order (order._id)}
						<li class="order-item">
							<button type="button" class="order-summary" onclick={() => toggleOrder(order._id)}>
								<div class="order-meta">
									<span class="order-id">#{order._id}</span>
									<span class="order-sub">
										{new Date(order._creationTime).toLocaleDateString()} · {order.items.length} item{order
											.items.length !== 1
											? 's'
											: ''}
									</span>
								</div>
								<div class="order-status">
									{#if order.latestTracking}
										<span>{order.latestTracking.status ?? 'In progress'}</span>
									{/if}
									<span>{expandedOrderId === order._id ? '▲' : '▼'}</span>
								</div>
							</button>

							{#if expandedOrderId === order._id}
								<a href={'user/' + [order._id]}> View Invoice </a>
								<div class="order-detail">
									{#if orderDetailQuery?.isLoading}
										<p class="status-msg">Loading...</p>
									{:else if orderDetailQuery?.error}
										<p class="status-msg error">{orderDetailQuery.error.message}</p>
									{:else if orderDetailQuery?.data}
										{@const detail = orderDetailQuery.data}

										{#if detail.address}
											<div class="detail-block">
												<p class="detail-label">Delivery Address</p>
												<p>
													{detail.address.street}, {detail.address.city}, {detail.address.state}
													{detail.address.pincode}
												</p>
											</div>
										{/if}

										<ul class="order-items">
											{#each detail.items as item (item._id)}
												<li class="order-line">
													<div>
														<p class="item-name">{item.product?.name ?? 'Unknown product'}</p>
														<p class="item-qty">Qty: {item.quantity ?? 1}</p>
													</div>
													<p class="item-price">
														{item.product?.salePrice != null ? `₹${item.product.salePrice}` : '—'}
													</p>
												</li>
											{/each}
										</ul>

										{#if detail.tracking.length}
											<div class="detail-block">
												<p class="detail-label">Tracking</p>
												<ol class="tracking-list">
													{#each detail.tracking as event (event._id)}
														<li>
															{new Date(event._creationTime).toLocaleString()} — {event.status ??
																'Update'}
															{#if event.message}
																· {event.message}{/if}
														</li>
													{/each}
												</ol>
											</div>
										{/if}
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>

				{#if ordersQuery.status !== 'Exhausted'}
					<button
						type="button"
						class="load-more"
						disabled={ordersQuery.isLoading}
						onclick={() => ordersQuery.loadMore(5)}
					>
						{ordersQuery.isLoading ? 'Loading...' : 'Load more orders'}
					</button>
				{/if}
			{/if}
		</section>
	{/if}
</main>

<style lang="postcss">
	@reference "src/app.css";
</style>
