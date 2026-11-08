<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import ShipForm from '#lib/store/admin/ShipForm.svelte';
	import { errorText, formatDate, formatPrice, formatTime } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	const text = strings.admin.orders;
	const client = useConvexClient();
	const number = $derived(page.params.number ?? '');
	const result = useQuery(api.store.admin.orders.get, () => ({ number }));
	const order = $derived(result.data);

	const when = (at: number) => `${formatDate(at)}, ${formatTime(at)}`;
	const history = $derived.by(() => {
		if (!order) return [];
		const steps: { label: string; at: number | undefined }[] = [
			{ label: text.steps.placed, at: order.placedAt },
			{ label: text.steps.paid, at: order.paidAt },
			{ label: text.steps.packed, at: order.packedAt },
			{ label: text.steps.shipped, at: order.shippedAt },
			{ label: text.steps.delivered, at: order.deliveredAt },
			{ label: text.steps.cancelled, at: order.cancelledAt }
		];
		return steps.filter((step): step is { label: string; at: number } => step.at !== undefined);
	});
	const canCancel = $derived(
		!!order && ['awaiting_payment', 'confirmed', 'paid', 'packed'].includes(order.status)
	);

	let confirmCancel = $state(false);
	let error = $state('');
	let busy = $state(false);
	const run = async (action: () => Promise<unknown>) => {
		busy = true;
		error = '';
		try {
			await action();
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>{number} · {strings.admin.title}</title>
</svelte:head>

<a class="back" href={resolve('/admin/orders')}>
	<ArrowLeftIcon size={18} aria-hidden="true" />
	{text.back}
</a>

{#if result.isLoading}
	<div class="flex justify-center py-16"><Spinner /></div>
{:else if !order}
	<Notice tone="warn" role="status">{text.notFound}</Notice>
{:else}
	<header class="head">
		<div>
			<h1>{order.number}</h1>
			<p class="text-text-muted text-sm">{when(order.placedAt)}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Pill>{text.statuses[order.status]}</Pill>
			<Pill tone={order.paymentStatus === 'paid' ? 'ok' : 'warn'}>
				{order.paymentMethod === 'cod' ? text.cod : text.online} ·
				{order.paymentStatus === 'paid' ? text.paid : text.unpaid}
			</Pill>
		</div>
	</header>

	{#if error}<div class="mb-3"><Notice tone="bad" role="alert">{error}</Notice></div>{/if}

	<div class="layout">
		<div class="main">
			{#if order.status === 'confirmed' || order.status === 'paid'}
				<section class="panel p-4">
					<Button
						variant="primary"
						large
						disabled={busy}
						onclick={() =>
							run(() => client.mutation(api.store.admin.orders.markPacked, { number }))}
					>
						{text.pack}
					</Button>
				</section>
			{:else if order.status === 'packed'}
				<section class="panel p-4">
					<h2>{strings.admin.ship.title}</h2>
					<ShipForm {number} local={order.deliveryMethod === 'local'} />
				</section>
			{:else if order.status === 'shipped'}
				<section class="panel p-4">
					<Button
						variant="primary"
						large
						disabled={busy}
						onclick={() =>
							run(() => client.mutation(api.store.admin.orders.markDelivered, { number }))}
					>
						{text.deliver}
					</Button>
				</section>
			{/if}

			{#if order.returnRequest}
				<section class="panel p-4">
					<h2>{text.returnTitle}</h2>
					<p class="mb-2 text-sm">“{order.returnRequest.reason}”</p>
					<p class="text-text-muted mb-3 text-xs">
						{when(order.returnRequest.requestedAt)} · {text.returnStatus[
							order.returnRequest.status
						]}
					</p>
					{#if order.returnRequest.status === 'requested'}
						<p class="text-text-muted mb-3 text-sm">{text.returnHint}</p>
						<div class="flex gap-2">
							<Button
								variant="primary"
								disabled={busy}
								onclick={() =>
									run(() =>
										client.mutation(api.store.admin.orders.answerReturn, { number, approve: true })
									)}>{text.approve}</Button
							>
							<Button
								disabled={busy}
								onclick={() =>
									run(() =>
										client.mutation(api.store.admin.orders.answerReturn, { number, approve: false })
									)}>{text.reject}</Button
							>
						</div>
					{/if}
				</section>
			{/if}

			<section class="panel p-4">
				<h2>{text.items}</h2>
				<ul class="items">
					{#each order.items as item (item._id)}
						<li>
							<span class="title">
								{item.title}{item.variantLabel && item.variantLabel !== 'Default'
									? ` · ${item.variantLabel}`
									: ''}
								{#if item.fromSet}<span class="text-text-muted text-xs">({text.fromSet})</span>{/if}
							</span>
							<span class="qty">× {item.quantity}</span>
							<span class="price">{formatPrice(item.unitPrice * item.quantity)}</span>
						</li>
					{/each}
				</ul>
				<dl class="sums">
					<dt>{text.subtotal}</dt>
					<dd>{formatPrice(order.subtotal)}</dd>
					<dt>{text.shippingFee}</dt>
					<dd>{formatPrice(order.shippingFee)}</dd>
					<dt class="font-extrabold">{text.total}</dt>
					<dd class="font-extrabold">{formatPrice(order.total)}</dd>
				</dl>
			</section>
		</div>

		<div class="side">
			<section class="panel p-4">
				<h2>{text.address}</h2>
				<address>
					<strong>{order.address.name}</strong><br />
					<a href="tel:{order.address.phone}">{order.address.phone}</a><br />
					{order.address.line1}<br />
					{#if order.address.line2}{order.address.line2}<br />{/if}
					{#if order.address.landmark}{order.address.landmark}<br />{/if}
					{order.address.city}, {order.address.state}
					{order.address.pincode}
				</address>
				<p class="text-text-muted mt-2 text-xs">
					{text.zone(order.zoneName, order.deliveryMethod === 'local')}
				</p>
			</section>

			{#if order.shipment}
				<section class="panel p-4">
					<h2>{text.shipment}</h2>
					<p class="text-sm">
						{order.shipment.courier} · <span class="font-mono">{order.shipment.awb}</span>
					</p>
					<p class="text-text-muted text-xs">{when(order.shipment.shippedAt)}</p>
					{#if order.shipment.trackingUrl}
						<a class="link" href={order.shipment.trackingUrl} target="_blank" rel="noreferrer"
							>{text.trackingLink}</a
						>
					{/if}
				</section>
			{/if}

			{#if order.payments.length > 0}
				<section class="panel p-4">
					<h2>{text.attempts}</h2>
					<ul class="flex flex-col gap-2 text-sm">
						{#each order.payments as payment (payment._id)}
							<li>
								{formatPrice(payment.amount)} · {payment.status}
								{#if payment.refund}· {text.refund(payment.refund.status)}{/if}
								<span class="text-text-muted block text-xs">
									{when(payment.createdAt)}{payment.gatewayPaymentId
										? ` · ${payment.gatewayPaymentId}`
										: ''}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="panel p-4">
				<h2>{text.history}</h2>
				<ol class="flex flex-col gap-1 text-sm">
					{#each history as step (step.label)}
						<li class="flex justify-between gap-2">
							<span>{step.label}</span><span class="text-text-muted">{when(step.at)}</span>
						</li>
					{/each}
				</ol>
			</section>

			{#if canCancel}
				<Button variant="danger" disabled={busy} onclick={() => (confirmCancel = true)}>
					{text.cancel}
				</Button>
			{/if}
		</div>
	</div>

	<ConfirmDialog
		bind:open={confirmCancel}
		title={text.cancelTitle}
		description={text.cancelDescription}
		confirmLabel={text.cancel}
		cancelLabel={text.keep}
		onconfirm={() =>
			run(async () => {
				await client.mutation(api.store.admin.orders.cancel, { number });
				confirmCancel = false;
			})}
	/>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.back {
		@apply mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-muted;
	}
	.head {
		@apply mb-4 flex flex-wrap items-start justify-between gap-3;

		h1 {
			@apply font-mono text-2xl font-extrabold;
		}
	}
	.layout {
		@apply grid items-start gap-4 lg:grid-cols-[3fr_2fr];
	}
	.main,
	.side {
		@apply flex flex-col gap-4;
	}
	h2 {
		@apply mb-3 text-lg font-extrabold;
	}
	.items li {
		@apply flex items-baseline gap-2 border-b border-border-muted py-2 text-sm last:border-b-0;
	}
	.title {
		@apply flex-1;
	}
	.qty {
		@apply text-text-muted;
	}
	.price {
		@apply font-bold;
	}
	.sums {
		@apply mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm;

		dd {
			@apply text-right;
		}
	}
	address {
		@apply text-sm not-italic;
	}
	.link {
		@apply mt-1 inline-block text-sm font-bold text-primary underline;
	}
</style>
