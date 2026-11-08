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

<section class="payments">
	{#if setup.data}
		{#if setup.data.missing.length === 0}
			<Notice role="status">{text.paymentsReady}</Notice>
		{:else}
			<Notice tone="warn" role="status">
				{text.paymentsMissing}
				<span class="names">{setup.data.missing.join(', ')}</span>
			</Notice>
		{/if}
		<div>
			<p class="label">{text.webhook}</p>
			<p class="url">{setup.data.webhookUrl}</p>
		</div>
	{/if}

	<h3>{text.recent}</h3>
	{#if !payments.data}
		<div class="loading bone"></div>
	{:else if payments.data.length === 0}
		<p class="empty">{text.noPayments}</p>
	{:else}
		<ul class="rows">
			{#each payments.data.slice(0, 30) as payment (payment.createdAt + payment.orderNumber)}
				<li>
					<a
						class="number"
						href={resolve('/admin/orders/[number]', { number: payment.orderNumber })}
						>{payment.orderNumber}</a
					>
					<span>{formatPrice(payment.amount)} · {payment.status}</span>
					{#if payment.refund}<span>· {text.refund(payment.refund.status)}</span>{/if}
					<span class="when">
						{formatDate(payment.createdAt)}, {formatTime(payment.createdAt)}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style lang="postcss">
	@reference 'src/app.css';

	section.payments {
		@apply flex flex-col gap-4 rounded-[1.75rem] raised p-5;

		span.names {
			@apply font-mono;
		}
		p.label {
			@apply type-kicker;
		}
		p.url {
			@apply mt-1 rounded-2xl sunken p-3 font-mono text-sm break-all;
		}
		h3 {
			@apply mt-2 type-title;
		}
		div.loading {
			@apply h-20 rounded-2xl;
		}
		p.empty {
			@apply text-sm text-text-muted;
		}
		ul.rows {
			@apply rounded-2xl sunken px-4;

			li {
				@apply flex flex-wrap items-baseline gap-x-2 border-b border-border-muted py-2 text-sm last:border-b-0;
			}
			a.number {
				@apply font-mono font-bold;
			}
			span.when {
				@apply block w-full text-xs text-text-muted;
			}
		}
	}
</style>
