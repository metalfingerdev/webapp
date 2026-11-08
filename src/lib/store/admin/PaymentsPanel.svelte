<script lang="ts">
	import { resolve } from '$app/paths';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { formatDate, formatPrice, formatTime } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Notice from '#lib/ui/Notice.svelte';

	// Is Razorpay set up here (env var names only, never values), and the latest payments
	const text = strings.admin.settings;
	const setup = useQuery(api.store.admin.payments.checkSetup, {});
	const payments = useQuery(api.store.admin.payments.list, {});
</script>

<section class="panel flex flex-col gap-3 p-4">
	{#if setup.data}
		{#if setup.data.missing.length === 0}
			<Notice role="status">{text.paymentsReady}</Notice>
		{:else}
			<Notice tone="warn" role="status">
				{text.paymentsMissing}
				<span class="font-mono">{setup.data.missing.join(', ')}</span>
			</Notice>
		{/if}
		<div>
			<p class="text-text-muted text-xs">{text.webhook}</p>
			<p class="font-mono text-sm break-all">{setup.data.webhookUrl}</p>
		</div>
	{/if}

	<h3 class="font-extrabold">{text.recent}</h3>
	{#if !payments.data}
		<div class="bone h-20 rounded-xl"></div>
	{:else if payments.data.length === 0}
		<p class="text-text-muted text-sm">{text.noPayments}</p>
	{:else}
		<ul class="rows">
			{#each payments.data.slice(0, 30) as payment (payment.createdAt + payment.orderNumber)}
				<li>
					<a
						class="font-mono font-bold"
						href={resolve('/admin/orders/[number]', { number: payment.orderNumber })}
						>{payment.orderNumber}</a
					>
					<span>{formatPrice(payment.amount)} · {payment.status}</span>
					{#if payment.refund}<span>· {text.refund(payment.refund.status)}</span>{/if}
					<span class="text-text-muted block w-full text-xs">
						{formatDate(payment.createdAt)}, {formatTime(payment.createdAt)}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style lang="postcss">
	@reference 'src/app.css';

	.rows li {
		@apply flex flex-wrap items-baseline gap-x-2 border-b border-border-muted py-2 text-sm last:border-b-0;
	}
</style>
