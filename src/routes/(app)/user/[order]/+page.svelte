<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { page } from '$app/state';
	import type { Id } from '$convex/_generated/dataModel.js';

	const orderId = page.params.order as Id<'orders'>;

	const invoice = useQuery(api.orders.getOrderInvoice, { orderId });

	$effect(() => {
		if (invoice.data) window.print();
	});
</script>

{#if invoice.data}
	{@const { order, lines } = invoice.data}
	<div class="invoice">
		<h1>Aggarwal Books And Stationery Mart</h1>
		<p>SCF-119, HUDA Market Part-1, Sector-19, Faridabad</p>
		<p>GST No. 06AHUPT7589A1ZM</p>

		<h2>INVOICE</h2>
		<p>Order: {order._id}</p>
		<p>Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>

		<table>
			<thead>
				<tr><th>Product</th><th>HSN</th><th>GST%</th><th>Qty</th><th>Price</th></tr>
			</thead>
			<tbody>
				{#each lines as line}
					<tr>
						<td>{line.product?.name}</td>
						<td>{line.product?.hsnCode ?? ''}</td>
						<td>{line.product?.taxCategory ?? 'Exempt'}</td>
						<td>{line.quantity}</td>
						<td>₹{((line.priceAtPurchase * line.quantity) / 100).toFixed(2)}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<p>Shipping: ₹{(order.shipping / 100).toFixed(2)}</p>
		<p><strong>Total: ₹{(order.totalPrice / 100).toFixed(2)}</strong></p>
	</div>
{/if}

<style lang="postcss">
	@media print {
		:global(nav),
		:global(header),
		:global(footer) {
			display: none;
		}
	}
</style>
