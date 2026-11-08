<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { useRequireSignIn } from '#lib/auth/requireSignIn.svelte.js';
	import { errorText, formatDate, formatPrice, formatTime } from '#lib/store/format.js';
	import { payForOrder } from '#lib/store/pay.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';

	useRequireSignIn();
	const text = strings.orders;
	const client = useConvexClient();
	const number = $derived(page.params.number ?? '');
	const result = useQuery(api.store.orders.getOrder, () => ({ number }));
	const order = $derived(result.data);

	const steps = $derived(
		order
			? [
					{ label: text.steps.placed, at: order.placedAt },
					{ label: text.steps.packed, at: order.packedAt },
					{
						label:
							order.deliveryMethod === 'local' ? text.steps.outForDelivery : text.steps.shipped,
						at: order.shippedAt
					},
					{ label: text.steps.delivered, at: order.deliveredAt }
				]
			: []
	);

	let confirming = $state(false);
	let reason = $state('');
	let error = $state('');
	let busy = $state(false);
	const run = async (action: () => Promise<unknown>) => {
		busy = true;
		error = '';
		try {
			await action();
		} catch (e) {
			error = errorText(e, 'Something went wrong. Please try again.');
		} finally {
			busy = false;
		}
	};
	const cancel = () =>
		run(async () => {
			await client.mutation(api.store.orders.cancelOrder, { number });
			confirming = false;
		});
	let checking = $state(false);
	const pay = async () => {
		busy = true;
		error = '';
		try {
			const outcome = await payForOrder(client, number);
			checking = outcome === 'pending';
		} catch (e) {
			error = errorText(e, text.payFailed);
		} finally {
			busy = false;
		}
	};
	const sendReturn = () =>
		run(async () => {
			await client.mutation(api.store.orders.requestReturn, { number, reason });
			reason = '';
		});
</script>

<svelte:head><title>{text.number} {number} · {strings.brand}</title></svelte:head>

<a class="back" href={resolve('/(shop)/orders')}>{text.back}</a>
{#if result.error}
	<p class="note">{text.notFound}</p>
{:else if order}
	{#if page.url.searchParams.has('placed')}
		<Notice tone="info" role="status">{text.thanks}</Notice>
	{/if}
	<h1 class="title">
		{text.number}
		{order.number}
		<Pill
			tone={order.status === 'cancelled' ? 'bad' : order.status === 'delivered' ? 'ok' : 'warn'}
		>
			{text.status[order.status]}
		</Pill>
	</h1>

	{#if order.status === 'awaiting_payment'}
		<section class="block">
			{#if checking}
				<Notice tone="info" role="status">{text.payChecking}</Notice>
			{:else}
				{#if order.payBy}<p>{text.payBy(formatTime(order.payBy))}</p>{/if}
				<Button variant="primary" large disabled={busy} onclick={pay}>
					{busy ? text.paying : text.payNow(formatPrice(order.total))}
				</Button>
			{/if}
		</section>
	{/if}

	{#if order.refund}
		<Notice tone={order.refund.status === 'failed' ? 'bad' : 'info'} role="status">
			{#if order.refund.status === 'processed'}
				{text.refundDone(formatPrice(order.refund.amount))}
			{:else if order.refund.status === 'failed'}
				{text.refundFailed}
			{:else}
				{text.refundPending(formatPrice(order.refund.amount))}
			{/if}
		</Notice>
	{/if}

	{#if order.status === 'cancelled' && order.cancelledAt}
		<Notice tone="warn">{text.cancelledOn(formatDate(order.cancelledAt))}</Notice>
	{:else}
		<ol class="timeline">
			{#each steps as step (step.label)}
				<li class:done={step.at !== undefined}>
					<span class="dot" aria-hidden="true"></span>
					<span>{step.label}</span>
					{#if step.at !== undefined}<span class="note">{formatDate(step.at)}</span>{/if}
				</li>
			{/each}
		</ol>
	{/if}

	{#if order.shipment}
		<section class="block">
			<p>{text.courier}: <strong>{order.shipment.courier}</strong></p>
			<p>{text.trackingNumber}: <strong>{order.shipment.awb}</strong></p>
			{#if order.shipment.trackingUrl}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={order.shipment.trackingUrl} rel="noopener noreferrer" target="_blank">
					{text.track}
				</a>
			{/if}
		</section>
	{/if}

	<section class="block">
		<ul class="lines">
			{#each order.items as item, i (i)}
				<li>
					<span>
						{item.title}
						{#if item.variantLabel}<span class="note">{item.variantLabel}</span>{/if}
						<span class="note">{strings.checkout.qty(item.quantity)}</span>
					</span>
					<span class="amount">{formatPrice(item.unitPrice * item.quantity)}</span>
				</li>
			{/each}
		</ul>
		<dl class="sums">
			<div>
				<dt>{strings.checkout.subtotal}</dt>
				<dd>{formatPrice(order.subtotal)}</dd>
			</div>
			<div>
				<dt>{strings.checkout.deliveryTo(order.zoneName)}</dt>
				<dd>{order.shippingFee === 0 ? strings.checkout.free : formatPrice(order.shippingFee)}</dd>
			</div>
			<div class="total">
				<dt>{strings.checkout.total}</dt>
				<dd>{formatPrice(order.total)}</dd>
			</div>
		</dl>
		<p class="note">
			{text.paidBy}:
			{order.paymentMethod === 'cod'
				? text.cod
				: order.paymentStatus === 'refunded'
					? text.refunded
					: order.paymentStatus === 'paid'
						? text.online
						: text.onlineUnpaid}
		</p>
	</section>

	<section class="block">
		<h2>{text.address}</h2>
		<p>
			<strong>{order.address.name}</strong><br />
			{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}{order.address
				.landmark
				? `, ${order.address.landmark}`
				: ''}<br />
			{order.address.city}, {order.address.state}
			{order.address.pincode}<br />
			{order.address.phone}
		</p>
	</section>

	{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}

	{#if order.canCancel}
		<section class="block">
			<p class="note">{text.cancelNote}</p>
			<Button variant="danger" onclick={() => (confirming = true)}>{text.cancel}</Button>
		</section>
		<ConfirmDialog
			bind:open={confirming}
			title={text.confirmCancel}
			confirmLabel={text.yesCancel}
			cancelLabel={text.keep}
			onconfirm={cancel}
		/>
	{/if}

	{#if order.returnRequest}
		<Notice tone="info" role="status">{text.returnSent}</Notice>
	{:else if order.canRequestReturn}
		<section class="block">
			<h2>{text.returnTitle}</h2>
			{#if order.returnBy}<p class="note">{text.returnBy(formatDate(order.returnBy))}</p>{/if}
			<label class="field-label">
				<span class="field-caption">{text.returnReason}</span>
				<textarea class="control" rows="3" maxlength="500" bind:value={reason}></textarea>
			</label>
			<Button disabled={busy || !reason.trim()} onclick={sendReturn}>{text.returnSend}</Button>
		</section>
	{/if}
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.back {
		@apply inline-flex min-h-11 items-center text-sm font-bold text-primary;
	}

	.title {
		@apply my-3 flex flex-wrap items-center gap-3 text-2xl font-extrabold;
	}

	h2 {
		@apply mb-2 text-lg font-extrabold;
	}

	.note {
		@apply text-sm text-text-muted tabular-nums;
	}

	.block {
		@apply my-4 flex flex-col gap-2 panel p-4;
	}

	.timeline {
		@apply my-4 flex flex-col gap-3;

		li {
			@apply flex items-center gap-3 text-text-muted;

			&.done {
				@apply font-bold text-text;
			}
		}

		.dot {
			@apply size-3 shrink-0 rounded-full sunken;
		}

		.done .dot {
			@apply raised-primary;
		}
	}

	.lines li {
		@apply flex justify-between gap-3;
	}

	.amount,
	.sums dd {
		@apply tabular-nums;
	}

	.sums {
		@apply flex flex-col gap-1 border-t border-border-muted pt-3;

		div {
			@apply flex justify-between gap-3;
		}

		.total {
			@apply text-xl font-extrabold;
		}
	}
</style>
