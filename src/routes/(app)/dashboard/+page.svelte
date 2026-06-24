<script lang="ts">
	import { useQuery, useMutation } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import type { Id } from '$convex/_generated/dataModel.js';
	import { usePaginatedQuery } from 'convex-svelte';

	type Category = 'book' | 'clothes' | 'stationary';
	type ProductFilter = 'all' | Category;
	type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
	type TrackingStatus =
		| 'order_placed'
		| 'processing'
		| 'dispatched'
		| 'in_transit'
		| 'out_for_delivery'
		| 'delivered';
	type Tab = 'products' | 'schools' | 'orders';

	// ── Tab ────────────────────────────────────────────────────────────────────
	let activeTab = $state<Tab>('products');

	// ── Queries ────────────────────────────────────────────────────────────────
	const productsQ = useQuery(api.dashboard.listProducts);
	const schoolsQ = useQuery(api.dashboard.listSchools);
	const statsQ = useQuery(api.dashboard.getDashboardStats);

	// ── Product filter ─────────────────────────────────────────────────────────
	let filter = $state<ProductFilter>('all');

	const rows = $derived(
		filter === 'all'
			? (productsQ.data ?? [])
			: (productsQ.data ?? []).filter((p) => p.category === filter)
	);

	// ── School name lookup ─────────────────────────────────────────────────────
	const schoolMap = $derived<Record<string, string>>(
		Object.fromEntries((schoolsQ.data ?? []).map((s) => [s._id, s.name]))
	);

	type Product = NonNullable<typeof productsQ.data>[number];

	function getSchool(p: Product): string {
		const d = p.details;
		if ((d.type === 'book' || d.type === 'clothes') && d.school) {
			return schoolMap[d.school] ?? '—';
		}
		return '—';
	}

	// ── Product mutations ──────────────────────────────────────────────────────
	const createProduct = useMutation(api.dashboard.createProduct);
	const updateProduct = useMutation(api.dashboard.updateProduct);
	const removeProduct = useMutation(api.dashboard.removeProduct);
	const adjustStock = useMutation(api.dashboard.adjustStock);

	// ── Product modal ──────────────────────────────────────────────────────────
	let productModalEl = $state<HTMLDialogElement>();
	let editingProductId = $state<Id<'products'> | null>(null);

	let f = $state({
		name: '',
		weight: 0, // <-- Add this line
		imageUrl: '',
		category: 'book' as Category,
		priceRupees: 0,
		stock: 0,
		author: '',
		subject: '',
		bookSchool: '' as Id<'schools'> | '',
		gender: '',
		size: '',
		variant: 'white' as 'white' | 'sports',
		clothesSchool: '' as Id<'schools'> | '',
		itemType: ''
	});

	function resetProductForm() {
		f = {
			name: '',
			weight: 0,
			imageUrl: '',
			category: 'book',
			priceRupees: 0,
			stock: 0,
			author: '',
			subject: '',
			bookSchool: '',
			gender: '',
			size: '',
			variant: 'white',
			clothesSchool: '',
			itemType: ''
		};
	}

	function openCreateProduct() {
		editingProductId = null;
		resetProductForm();
		productModalEl?.showModal();
	}

	function openEditProduct(p: Product) {
		editingProductId = p._id;
		const d = p.details;
		f.name = p.name;
		f.weight = p.weight;
		f.imageUrl = p.imageUrl ?? '';
		f.category = p.category as Category;
		f.priceRupees = p.salePrice / 100;
		f.stock = p.stock;
		if (d.type === 'book') {
			f.author = d.author;
			f.subject = d.subject;
			f.bookSchool = (d.school as Id<'schools'>) ?? '';
		} else if (d.type === 'clothes') {
			f.gender = d.gender;
			f.size = d.size;
			f.variant = d.variant;
			f.clothesSchool = (d.school as Id<'schools'>) ?? '';
		} else {
			f.itemType = d.itemType;
		}
		productModalEl?.showModal();
	}

	function buildDetails() {
		if (f.category === 'book') {
			return {
				type: 'book' as const,
				author: f.author,
				subject: f.subject,
				...(f.bookSchool ? { school: f.bookSchool as Id<'schools'> } : {})
			};
		}
		if (f.category === 'clothes') {
			return {
				type: 'clothes' as const,
				gender: f.gender,
				size: f.size,
				variant: f.variant,
				...(f.clothesSchool ? { school: f.clothesSchool as Id<'schools'> } : {})
			};
		}
		return { type: 'stationary' as const, itemType: f.itemType };
	}

	let productSubmitting = $state(false);

	async function submitProduct() {
		productSubmitting = true;
		try {
			const payload = {
				name: f.name,
				weight: f.weight,
				imageUrl: f.imageUrl || undefined,
				category: f.category,
				salePrice: Math.round(f.priceRupees * 100),
				stock: f.stock,
				details: buildDetails()
			};
			if (editingProductId) {
				await updateProduct({ id: editingProductId, ...payload });
			} else {
				await createProduct(payload);
			}
			productModalEl?.close();
		} finally {
			productSubmitting = false;
		}
	}

	let deleteProductId = $state<Id<'products'> | null>(null);

	async function confirmDeleteProduct() {
		if (!deleteProductId) return;
		await removeProduct({ id: deleteProductId });
		deleteProductId = null;
	}

	// Stock adjust inline
	let stockDelta = $state<Record<string, number>>({});

	async function submitStockAdjust(id: Id<'products'>) {
		const delta = stockDelta[id];
		if (!delta) return;
		await adjustStock({ id, delta });
		stockDelta = { ...stockDelta, [id]: 0 };
	}

	// ── School mutations ───────────────────────────────────────────────────────
	const createSchool = useMutation(api.dashboard.createSchool);
	const updateSchool = useMutation(api.dashboard.updateSchool);
	const removeSchool = useMutation(api.dashboard.removeSchool);
	const addToBundle = useMutation(api.dashboard.addToBundle);
	const removeFromBundle = useMutation(api.dashboard.removeFromBundle);

	// ── School modal ───────────────────────────────────────────────────────────
	let schoolModalEl = $state<HTMLDialogElement>();
	let editingSchoolId = $state<Id<'schools'> | null>(null);
	let schoolForm = $state({ name: '', code: '' });
	let schoolSubmitting = $state(false);
	let schoolError = $state('');

	function openCreateSchool() {
		editingSchoolId = null;
		schoolForm = { name: '', code: '' };
		schoolError = '';
		schoolModalEl?.showModal();
	}

	function openEditSchool(s: NonNullable<typeof schoolsQ.data>[number]) {
		editingSchoolId = s._id;
		schoolForm = { name: s.name, code: s.code ?? '' };
		schoolError = '';
		schoolModalEl?.showModal();
	}

	async function submitSchool() {
		schoolSubmitting = true;
		schoolError = '';
		try {
			const payload = { name: schoolForm.name, code: schoolForm.code || undefined };
			if (editingSchoolId) {
				await updateSchool({ id: editingSchoolId, ...payload });
			} else {
				await createSchool(payload);
			}
			schoolModalEl?.close();
		} catch (e: unknown) {
			schoolError = e instanceof Error ? e.message : 'Something went wrong.';
		} finally {
			schoolSubmitting = false;
		}
	}

	let deleteSchoolId = $state<Id<'schools'> | null>(null);
	let deleteSchoolError = $state('');

	async function confirmDeleteSchool() {
		if (!deleteSchoolId) return;
		deleteSchoolError = '';
		try {
			await removeSchool({ id: deleteSchoolId });
			deleteSchoolId = null;
		} catch (e: unknown) {
			deleteSchoolError = e instanceof Error ? e.message : 'Could not delete.';
		}
	}

	// ── Bundle panel (inline per school row) ──────────────────────────────────
	let expandedSchoolId = $state<Id<'schools'> | null>(null);
	let bundleGradeFilter = $state('');

	// Reactive bundle query — only runs when a school is expanded
	const bundlesQ = $derived(
		expandedSchoolId
			? useQuery(api.dashboard.listBundles, {
					schoolId: expandedSchoolId,
					grade: bundleGradeFilter || undefined
				})
			: null
	);

	let bundleProductId = $state<Id<'products'> | ''>('');
	let bundleGradeInput = $state('');
	let bundleSubmitting = $state(false);
	let bundleError = $state('');

	async function submitAddBundle() {
		if (!expandedSchoolId || !bundleProductId || !bundleGradeInput) return;
		bundleSubmitting = true;
		bundleError = '';
		try {
			await addToBundle({
				schoolId: expandedSchoolId,
				grade: bundleGradeInput,
				productId: bundleProductId as Id<'products'>
			});
			bundleProductId = '';
			bundleGradeInput = '';
		} catch (e: unknown) {
			bundleError = e instanceof Error ? e.message : 'Could not add.';
		} finally {
			bundleSubmitting = false;
		}
	}

	// ── Order mutations ────────────────────────────────────────────────────────
	const updateOrderStatus = useMutation(api.dashboard.updateOrderStatus);
	const cancelOrder = useMutation(api.dashboard.cancelOrder);
	const pushTrackingEvent = useMutation(api.dashboard.pushTrackingEvent);

	// ── Order filter + detail ─────────────────────────────────────────────────
	let orderStatusFilter = $state<OrderStatus | 'all'>('all');
	let expandedOrderId = $state<Id<'orders'> | null>(null);

	const ordersQ = usePaginatedQuery(
		api.dashboard.listOrders,
		() => ({ status: orderStatusFilter === 'all' ? undefined : orderStatusFilter }),
		{ initialNumItems: 50 }
	);

	// Per-order status update form
	let orderStatusDraft = $state<Record<string, OrderStatus>>({});
	let orderTrackingIdDraft = $state<Record<string, string>>({});
	let orderStatusSubmitting = $state<Record<string, boolean>>({});

	async function submitOrderStatus(id: Id<'orders'>) {
		const status = orderStatusDraft[id];
		if (!status) return;
		orderStatusSubmitting = { ...orderStatusSubmitting, [id]: true };
		try {
			await updateOrderStatus({
				id,
				status,
				trackingId: orderTrackingIdDraft[id] || undefined
			});
		} finally {
			orderStatusSubmitting = { ...orderStatusSubmitting, [id]: false };
		}
	}

	// Tracking event push
	let trackingModalEl = $state<HTMLDialogElement>();
	let trackingOrderId = $state<Id<'orders'> | null>(null);
	let trackingForm = $state({
		status: 'processing' as TrackingStatus,
		carrier: '',
		location: '',
		message: ''
	});
	let trackingSubmitting = $state(false);

	function openTrackingModal(orderId: Id<'orders'>) {
		trackingOrderId = orderId;
		trackingForm = { status: 'processing', carrier: '', location: '', message: '' };
		trackingModalEl?.showModal();
	}

	async function submitTracking() {
		if (!trackingOrderId) return;
		trackingSubmitting = true;
		try {
			await pushTrackingEvent({
				orderId: trackingOrderId,
				status: trackingForm.status,
				carrier: trackingForm.carrier || undefined,
				location: trackingForm.location || undefined,
				message: trackingForm.message || undefined
			});
			trackingModalEl?.close();
		} finally {
			trackingSubmitting = false;
		}
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

	const PRODUCT_FILTERS: { value: ProductFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'book', label: 'Books' },
		{ value: 'clothes', label: 'Clothes' },
		{ value: 'stationary', label: 'Stationary' }
	];

	const ORDER_STATUSES: OrderStatus[] = [
		'pending',
		'confirmed',
		'processing',
		'shipped',
		'delivered',
		'cancelled'
	];

	const TRACKING_STATUSES: TrackingStatus[] = [
		'order_placed',
		'processing',
		'dispatched',
		'in_transit',
		'out_for_delivery',
		'delivered'
	];
</script>

<!-- Stats -->
{#if statsQ.data}
	<p>
		Orders: {statsQ.data.totalOrders} · Revenue: {fmt(statsQ.data.totalRevenue)} · Products: {statsQ
			.data.totalProducts} · Schools: {statsQ.data.totalSchools}
		{#if statsQ.data.lowStockProducts.length > 0}
			· Low stock: {statsQ.data.lowStockProducts.length}
		{/if}
	</p>
{/if}

<!-- Tabs -->
<nav>
	<button onclick={() => (activeTab = 'products')}>Products</button>
	<button onclick={() => (activeTab = 'schools')}>Schools</button>
	<button onclick={() => (activeTab = 'orders')}>Orders</button>
</nav>

<!-- ── Products ── -->
{#if activeTab === 'products'}
	<h1>Products</h1>
	<button onclick={openCreateProduct}>+ Add</button>

	{#each PRODUCT_FILTERS as { value, label }}
		<button onclick={() => (filter = value)}>{label}</button>
	{/each}

	{#if productsQ.isLoading}
		<p>Loading…</p>
	{:else if rows.length === 0}
		<p>No products{filter !== 'all' ? ` in ${filter}` : ''}.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th><th>Category</th><th>School</th><th>Price</th><th>Stock</th><th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as p (p._id)}
					<tr>
						<td>{p.name}</td>
						<td>{p.details.type}</td>
						<td>{getSchool(p)}</td>
						<td>{fmt(p.salePrice)}</td>
						<td>{p.stock}</td>
						<td>
							{#if deleteProductId === p._id}
								Delete?
								<button onclick={confirmDeleteProduct}>Yes</button>
								<button onclick={() => (deleteProductId = null)}>No</button>
							{:else}
								<button onclick={() => openEditProduct(p)}>Edit</button>
								<button onclick={() => (deleteProductId = p._id)}>Delete</button>
								<input type="number" placeholder="±qty" bind:value={stockDelta[p._id]} />
								<button onclick={() => submitStockAdjust(p._id)} disabled={!stockDelta[p._id]}
									>Adjust</button
								>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<dialog
		bind:this={productModalEl}
		onclose={() => {
			editingProductId = null;
			resetProductForm();
		}}
	>
		<h2>{editingProductId ? 'Edit Product' : 'New Product'}</h2>
		<button onclick={() => productModalEl?.close()}>×</button>

		<label>Name <input bind:value={f.name} /></label>
		<label>Weight <input type="number" min="0" step="0.01" bind:value={f.weight} /></label>
		<label>Image URL <input bind:value={f.imageUrl} placeholder="optional" /></label>
		<label>Price (₹) <input type="number" min="0" step="0.01" bind:value={f.priceRupees} /></label>
		<label>Stock <input type="number" min="0" bind:value={f.stock} /></label>
		<label
			>Category
			<select bind:value={f.category}>
				<option value="book">Book</option>
				<option value="clothes">Clothes</option>
				<option value="stationary">Stationary</option>
			</select>
		</label>

		{#if f.category === 'book'}
			<label>Author <input bind:value={f.author} /></label>
			<label>Subject <input bind:value={f.subject} /></label>
			<label
				>School
				<select bind:value={f.bookSchool}>
					<option value="">— None —</option>
					{#each schoolsQ.data ?? [] as s}<option value={s._id}>{s.name}</option>{/each}
				</select>
			</label>
		{:else if f.category === 'clothes'}
			<label>Gender <input bind:value={f.gender} /></label>
			<label>Size <input bind:value={f.size} /></label>
			<label
				>Variant
				<select bind:value={f.variant}>
					<option value="white">White</option>
					<option value="sports">Sports</option>
				</select>
			</label>
			<label
				>School
				<select bind:value={f.clothesSchool}>
					<option value="">— None —</option>
					{#each schoolsQ.data ?? [] as s}<option value={s._id}>{s.name}</option>{/each}
				</select>
			</label>
		{:else if f.category === 'stationary'}
			<label>Item Type <input bind:value={f.itemType} /></label>
		{/if}

		<button onclick={() => productModalEl?.close()}>Cancel</button>
		<button onclick={submitProduct} disabled={productSubmitting}>
			{productSubmitting ? 'Saving…' : editingProductId ? 'Save Changes' : 'Create'}
		</button>
	</dialog>

	<!-- ── Schools ── -->
{:else if activeTab === 'schools'}
	<h1>Schools</h1>
	<button onclick={openCreateSchool}>+ Add</button>

	{#if schoolsQ.isLoading}
		<p>Loading…</p>
	{:else if (schoolsQ.data ?? []).length === 0}
		<p>No schools yet.</p>
	{:else}
		<table>
			<thead>
				<tr><th>Name</th><th>Code</th><th>Actions</th></tr>
			</thead>
			<tbody>
				{#each schoolsQ.data ?? [] as s (s._id)}
					<tr>
						<td>{s.name}</td>
						<td>{s.code ?? '—'}</td>
						<td>
							{#if deleteSchoolId === s._id}
								Delete?
								{#if deleteSchoolError}{deleteSchoolError}{/if}
								<button onclick={confirmDeleteSchool}>Yes</button>
								<button
									onclick={() => {
										deleteSchoolId = null;
										deleteSchoolError = '';
									}}>No</button
								>
							{:else}
								<button onclick={() => openEditSchool(s)}>Edit</button>
								<button
									onclick={() => {
										deleteSchoolId = s._id;
										deleteSchoolError = '';
									}}>Delete</button
								>
								<button
									onclick={() => {
										expandedSchoolId = expandedSchoolId === s._id ? null : s._id;
										bundleGradeFilter = bundleProductId = bundleGradeInput = bundleError = '';
									}}
								>
									{expandedSchoolId === s._id ? 'Hide bundles' : 'Bundles'}
								</button>
							{/if}
						</td>
					</tr>

					{#if expandedSchoolId === s._id}
						<tr>
							<td colspan="3">
								<label
									>Filter grade <input
										bind:value={bundleGradeFilter}
										placeholder="e.g. Class 5"
									/></label
								>

								<select bind:value={bundleProductId}>
									<option value="">Select product…</option>
									{#each productsQ.data ?? [] as p}<option value={p._id}>{p.name}</option>{/each}
								</select>
								<input bind:value={bundleGradeInput} placeholder="Grade (e.g. Class 5)" />
								<button
									onclick={submitAddBundle}
									disabled={bundleSubmitting || !bundleProductId || !bundleGradeInput}
								>
									{bundleSubmitting ? 'Adding…' : 'Add'}
								</button>
								{#if bundleError}<p>{bundleError}</p>{/if}

								{#if bundlesQ?.isLoading}
									<p>Loading…</p>
								{:else if (bundlesQ?.data ?? []).length === 0}
									<p>No bundle items{bundleGradeFilter ? ` for ${bundleGradeFilter}` : ''}.</p>
								{:else}
									<table>
										<thead><tr><th>Product</th><th>Grade</th><th></th></tr></thead>
										<tbody>
											{#each bundlesQ?.data ?? [] as b (b._id)}
												<tr>
													<td>{b.product?.name ?? '—'}</td>
													<td>{b.grade}</td>
													<td
														><button onclick={() => removeFromBundle({ id: b._id })}>Remove</button
														></td
													>
												</tr>
											{/each}
										</tbody>
									</table>
								{/if}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	{/if}

	<dialog
		bind:this={schoolModalEl}
		onclose={() => {
			editingSchoolId = null;
			schoolForm = { name: '', code: '' };
		}}
	>
		<h2>{editingSchoolId ? 'Edit School' : 'New School'}</h2>
		<button onclick={() => schoolModalEl?.close()}>×</button>

		<label>Name <input bind:value={schoolForm.name} placeholder="e.g. Delhi Public School" /></label
		>
		<label>Code <input bind:value={schoolForm.code} placeholder="e.g. DPS-01" /></label>

		{#if schoolError}<p>{schoolError}</p>{/if}

		<button onclick={() => schoolModalEl?.close()}>Cancel</button>
		<button onclick={submitSchool} disabled={schoolSubmitting || !schoolForm.name}>
			{schoolSubmitting ? 'Saving…' : editingSchoolId ? 'Save Changes' : 'Create'}
		</button>
	</dialog>

	<!-- ── Orders ── -->
{:else if activeTab === 'orders'}
	<h1>Orders</h1>

	<button onclick={() => (orderStatusFilter = 'all')}>All</button>
	{#each ORDER_STATUSES as s}
		<button onclick={() => (orderStatusFilter = s)}>{s}</button>
	{/each}

	{#if ordersQ.isLoading}
		<p>Loading…</p>
	{:else if ordersQ.results.length === 0}
		<p>No orders{orderStatusFilter !== 'all' ? ` with status "${orderStatusFilter}"` : ''}.</p>
	{:else}
		<table>
			<thead>
				<tr
					><th>Order ID</th><th>Status</th><th>Items</th><th>Total</th><th>Date</th><th>Actions</th
					></tr
				>
			</thead>
			<tbody>
				{#each ordersQ.results as o (o._id)}
					<tr>
						<td>{o._id.slice(-8)}</td>
						<td>{o.status}</td>
						<td>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
						<td>{fmt(o.totalPrice)}</td>
						<td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
						<td>
							<button
								onclick={() => {
									expandedOrderId = expandedOrderId === o._id ? null : o._id;
									if (!orderStatusDraft[o._id])
										orderStatusDraft = { ...orderStatusDraft, [o._id]: o.status as OrderStatus };
								}}
							>
								{expandedOrderId === o._id ? 'Collapse' : 'Details'}
							</button>
						</td>
					</tr>

					{#if expandedOrderId === o._id}
						<tr>
							<td colspan="6">
								{#if o.address}
									<p>
										{o.address.street}, {o.address.city}, {o.address.state} — {o.address.pincode}
										{#if o.address.label}({o.address.label}){/if}
									</p>
								{:else}
									<p>No address.</p>
								{/if}

								<table>
									<thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
									<tbody>
										{#each o.items as item (item._id)}
											<tr>
												<td>{item.product?.name ?? '—'}</td>
												<td>{item.quantity}</td>
												<td>{fmt(item.priceAtPurchase)}</td>
											</tr>
										{/each}
									</tbody>
								</table>

								<select bind:value={orderStatusDraft[o._id]}>
									{#each ORDER_STATUSES as s}<option value={s}>{s}</option>{/each}
								</select>
								{#if orderStatusDraft[o._id] === 'shipped'}
									<input bind:value={orderTrackingIdDraft[o._id]} placeholder="Tracking ID" />
								{/if}
								<button
									onclick={() => submitOrderStatus(o._id)}
									disabled={orderStatusSubmitting[o._id]}
								>
									{orderStatusSubmitting[o._id] ? 'Saving…' : 'Update'}
								</button>
								{#if o.status !== 'delivered' && o.status !== 'shipped' && o.status !== 'cancelled'}
									<button onclick={() => cancelOrder({ id: o._id })}>Cancel order</button>
								{/if}

								{#if o.trackingId}<p>Carrier ID: {o.trackingId}</p>{/if}
								<button onclick={() => openTrackingModal(o._id)}>+ Push tracking event</button>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	{/if}

	<dialog
		bind:this={trackingModalEl}
		onclose={() => {
			trackingOrderId = null;
		}}
	>
		<h2>Push tracking event</h2>
		<button onclick={() => trackingModalEl?.close()}>×</button>

		<label
			>Status
			<select bind:value={trackingForm.status}>
				{#each TRACKING_STATUSES as s}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label>Carrier <input bind:value={trackingForm.carrier} placeholder="e.g. Delhivery" /></label>
		<label
			>Location <input bind:value={trackingForm.location} placeholder="e.g. Mumbai hub" /></label
		>
		<label
			>Message <input
				bind:value={trackingForm.message}
				placeholder="e.g. Out for delivery"
			/></label
		>

		<button onclick={() => trackingModalEl?.close()}>Cancel</button>
		<button onclick={submitTracking} disabled={trackingSubmitting}>
			{trackingSubmitting ? 'Pushing…' : 'Push event'}
		</button>
	</dialog>
{/if}

<style lang="postcss">
	@reference "src/app.css";
</style>
