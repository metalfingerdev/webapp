<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { page } from '$app/state';
	import type { Id } from '$convex/_generated/dataModel.js';
	import { downloadInvoice, printInvoice } from '$lib/pdf/index.js';
	import { inr, formatDate } from '$lib/pdf/format.js';

	const orderId = page.params.order as Id<'orders'>;
	const invoice = useQuery(api.orders.getOrderInvoice, { orderId });

	let busy = $state(false);

	async function download() {
		if (!invoice.data) return;
		busy = true;
		try {
			await downloadInvoice(invoice.data);
		} finally {
			busy = false;
		}
	}

	async function print() {
		if (!invoice.data) return;
		await printInvoice(invoice.data);
	}
</script>

<main class="wrap">
	{#if invoice.isLoading}
		<p class="status">Loading invoice…</p>
	{:else if invoice.error}
		<p class="status error">{invoice.error.message}</p>
	{:else if !invoice.data}
		<p class="status">Invoice not found.</p>
	{:else}
		{@const doc = invoice.data}
		<header class="bar">
			<div>
				<h1>Invoice {doc.orderRef}</h1>
				<p class="muted">{formatDate(doc.createdAt)} · {doc.status}</p>
			</div>
			<div class="actions">
				<button class="primary" onclick={download} disabled={busy}>
					{busy ? 'Preparing…' : 'Download PDF'}
				</button>
				<button onclick={print} disabled={busy}>Print</button>
			</div>
		</header>

		<!-- On-screen preview; the canonical document is the generated PDF. -->
		<section class="preview">
			<table>
				<thead>
					<tr
						><th>Sr.</th><th>Product</th><th>HSN</th><th>GST %</th><th>QTY</th><th class="r"
							>Price</th
						></tr
					>
				</thead>
				<tbody>
					{#each doc.lines as line (line.sr)}
						<tr>
							<td>{line.sr}</td>
							<td>{line.name}</td>
							<td>{line.hsnCode}</td>
							<td>{line.gstLabel}</td>
							<td>{line.quantity}</td>
							<td class="r">{inr(line.lineTotal)}</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="totals">
				<div><span>Subtotal</span><span>{inr(doc.totals.subtotal)}</span></div>
				<div><span>Shipping</span><span>{inr(doc.totals.shipping)}</span></div>
				<div class="grand"><span>Total</span><span>{inr(doc.totals.total)}</span></div>
			</div>
		</section>
	{/if}
</main>

<style lang="postcss">
	@reference 'src/app.css';

	.wrap {
		@apply mx-auto grid max-w-3xl gap-6 p-6;
	}
	.status {
		@apply text-sm text-neutral-500;
	}
	.status.error {
		@apply text-red-600;
	}
	.bar {
		@apply flex items-start justify-between gap-4;

		h1 {
			@apply text-xl font-semibold;
		}
	}
	.muted {
		@apply text-sm text-neutral-500;
	}
	.actions {
		@apply flex gap-2;

		button {
			@apply cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium transition-colors;

			&:hover:not(:disabled) {
				@apply bg-neutral-100;
			}
			&:disabled {
				@apply cursor-not-allowed opacity-60;
			}
		}
		.primary {
			@apply border-transparent bg-neutral-900 text-white;

			&:hover:not(:disabled) {
				@apply bg-neutral-800;
			}
		}
	}
	.preview {
		@apply grid gap-4 rounded-xl border border-neutral-200 p-4;

		table {
			@apply w-full border-collapse text-sm;
		}
		thead th {
			@apply border-b border-neutral-200 px-2 py-2 text-left font-semibold;
		}
		tbody td {
			@apply border-b border-neutral-100 px-2 py-2;
		}
		.r {
			@apply text-right tabular-nums;
		}
	}
	.totals {
		@apply ml-auto grid w-64 gap-1 text-sm;

		div {
			@apply flex justify-between;
		}
		.grand {
			@apply mt-1 border-t border-neutral-300 pt-2 font-semibold;
		}
	}
</style>
