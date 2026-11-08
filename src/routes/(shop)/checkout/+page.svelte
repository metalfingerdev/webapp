<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { useRequireSignIn } from '#lib/auth/requireSignIn.svelte.js';
	import AddressForm from '#lib/store/AddressForm.svelte';
	import { errorText, formatPrice } from '#lib/store/format.js';
	import { payForOrder } from '#lib/store/pay.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';

	useRequireSignIn();
	const text = strings.checkout;
	const client = useConvexClient();

	const addresses = useQuery(api.store.addresses.list, {});
	let chosen = $state<Id<'addresses'> | null>(null);
	let adding = $state(false);
	let editing = $state<Id<'addresses'> | null>(null);
	// The picked address, else the default (listed first), else none
	const addressId = $derived(
		addresses.data?.find((a) => a.id === chosen)?.id ?? addresses.data?.[0]?.id ?? null
	);
	const preview = useQuery(api.store.checkout.preview, () => ({
		addressId: addressId ?? undefined
	}));

	let method = $state<'cod' | 'online'>('cod');
	let placing = $state(false);
	let paying = $state(false);
	let error = $state('');
	const view = $derived(preview.data);
	const canPlace = $derived(
		Boolean(view) &&
			view!.lines.length > 0 &&
			view!.shortages.length === 0 &&
			addressId !== null &&
			view!.zone !== null &&
			(method === 'cod' ? view!.cod : view!.online) &&
			!placing
	);

	const place = async () => {
		if (!addressId) return;
		placing = true;
		error = '';
		try {
			const { number } = await client.mutation(api.store.orders.placeOrder, {
				addressId,
				paymentMethod: method
			});
			const orderPage = resolve('/(shop)/orders/[number]', { number });
			if (method === 'online') {
				// The order exists now; if paying fails or is closed, its page offers "Pay" again
				paying = true;
				const outcome = await payForOrder(client, number).catch(() => 'closed' as const);
				await goto(outcome === 'closed' ? orderPage : `${orderPage}?placed=1`);
				return;
			}
			await goto(`${orderPage}?placed=1`);
		} catch (e) {
			error = errorText(e, 'We could not place your order. Please try again.');
		} finally {
			placing = false;
			paying = false;
		}
	};

	const removeAddress = async (id: Id<'addresses'>) => {
		await client.mutation(api.store.addresses.remove, { id });
		if (chosen === id) chosen = null;
	};
</script>

<svelte:head><title>{text.title} · {strings.brand}</title></svelte:head>

<PageHead title={text.title} size="headline" />

<div class="checkout">
	{#if view && view.lines.length === 0 && view.shortages.length === 0 && !placing}
		<p class="note">{text.emptyCart}</p>
		<Button href={resolve('/(shop)/cart')}>{text.backToCart}</Button>
	{:else}
		<div class="layout">
			<div class="steps">
				<section class="step">
					<h2>{text.address}</h2>
					{#if addresses.data && addresses.data.length === 0 && !adding}
						<AddressForm first onsaved={(id) => (chosen = id)} />
					{:else if addresses.data}
						<ul class="addresses">
							{#each addresses.data as address (address.id)}
								<li class="address" class:picked={address.id === addressId}>
									{#if editing === address.id}
										<AddressForm
											existing={address}
											onsaved={() => (editing = null)}
											oncancel={() => (editing = null)}
										/>
									{:else}
										<label class="pick">
											<input
												type="radio"
												name="address"
												checked={address.id === addressId}
												onchange={() => (chosen = address.id)}
											/>
											<span>
												<strong>{address.name}</strong>
												<span class="note">
													{address.line1}{address.line2
														? `, ${address.line2}`
														: ''}{address.landmark ? `, ${address.landmark}` : ''}, {address.city}, {address.state}
													{address.pincode}
												</span>
												<span class="note">{address.phone}</span>
											</span>
										</label>
										<span class="row-actions">
											<button type="button" onclick={() => (editing = address.id)}
												>{text.edit}</button
											>
											<button type="button" onclick={() => removeAddress(address.id)}>
												{text.remove}
											</button>
										</span>
									{/if}
								</li>
							{/each}
						</ul>
						{#if adding}
							<AddressForm
								onsaved={(id) => ((chosen = id), (adding = false))}
								oncancel={() => (adding = false)}
							/>
						{:else}
							<Button onclick={() => (adding = true)}>{text.addAddress}</Button>
						{/if}
					{/if}
					{#if view?.notDeliverable}
						<Notice tone="bad" role="alert">{text.notDeliverable}</Notice>
					{/if}
				</section>

				<section class="step">
					<h2>{text.payment}</h2>
					<label class="pay" class:off={!view?.cod}>
						<input type="radio" name="pay" value="cod" bind:group={method} disabled={!view?.cod} />
						<span>
							<strong>{text.cod}</strong>
							<span class="note">{text.codHint}</span>
						</span>
					</label>
					<label class="pay" class:off={!view?.online}>
						<input
							type="radio"
							name="pay"
							value="online"
							bind:group={method}
							disabled={!view?.online}
						/>
						<span>
							<strong>{text.online}</strong>
							<span class="note">{view && !view.online ? text.onlineOff : text.onlineHint}</span>
						</span>
					</label>
				</section>
			</div>

			<aside class="side">
				<h2>{text.review}</h2>
				{#if view}
					{#if view.shortages.length}
						<Notice tone="warn" role="alert">
							{text.fixCart}
							{#each view.shortages as line (line)}<span>{line}</span>{/each}
							<Button href={resolve('/(shop)/cart')}>{text.backToCart}</Button>
						</Notice>
					{/if}
					<ul class="lines">
						{#each view.lines as line (line.variantId)}
							<li>
								<span class="line-name">
									{line.title}
									{#if line.variantLabel !== 'Default'}<span class="note">{line.variantLabel}</span
										>{/if}
									<span class="note">{text.qty(line.quantity)}</span>
								</span>
								<span class="amount">{formatPrice(line.unitPrice * line.quantity)}</span>
							</li>
						{/each}
					</ul>
					<dl class="sums">
						<div>
							<dt>{text.subtotal}</dt>
							<dd>{formatPrice(view.subtotal)}</dd>
						</div>
						<div>
							<dt>{view.zone ? text.deliveryTo(view.zone.name) : text.delivery}</dt>
							<dd>
								{#if !view.zone}
									–
								{:else if view.shippingFee === 0}
									{text.free}
								{:else}
									{formatPrice(view.shippingFee)}
								{/if}
							</dd>
						</div>
						<div class="total">
							<dt>{text.total}</dt>
							<dd>{formatPrice(view.total)}</dd>
						</div>
					</dl>
					<p class="note">
						{#if view.zone}{view.zone.estimate}.{:else}{text.pickAddress}.{/if}
						{text.taxIncluded}.
					</p>
					{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
					<Button variant="primary" large block disabled={!canPlace} onclick={place}>
						{paying ? text.paying : placing ? text.placing : text.placeOrder}
					</Button>
				{/if}
			</aside>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.checkout {
		@apply flex flex-col items-start gap-4;

		h2 {
			@apply mb-1 type-title;
		}
		.note {
			@apply block text-sm text-text-muted;
		}

		div.layout {
			@apply grid w-full items-start gap-8 pb-8 md:grid-cols-[1fr_24rem];
		}
		div.steps {
			@apply flex flex-col gap-6;
		}
		section.step {
			@apply flex flex-col gap-4 rounded-[1.75rem] raised p-5;
		}

		ul.addresses {
			@apply flex flex-col gap-3;
		}
		li.address {
			@apply flex flex-col gap-1 rounded-2xl raised p-4;

			&.picked {
				@apply sunken;
			}
		}
		:is(label.pick, label.pay) {
			@apply flex min-h-11 cursor-pointer items-start gap-3;

			input {
				@apply mt-1 size-5 shrink-0 border-0 text-primary shadow-inset;
			}
			> span {
				@apply flex flex-col;
			}
		}
		label.pay {
			@apply rounded-2xl sunken p-4;

			&.off {
				@apply opacity-60;
			}
		}
		span.row-actions {
			@apply flex gap-4 pl-8;

			button {
				@apply min-h-11 text-sm font-bold text-accent;
			}
		}

		aside.side {
			@apply flex flex-col gap-4 rounded-[1.75rem] raised p-5 md:sticky md:top-28;
		}
		ul.lines {
			@apply flex flex-col gap-2;

			li {
				@apply flex justify-between gap-3;
			}
			span.line-name {
				@apply min-w-0;
			}
			span.amount {
				@apply tabular-nums;
			}
		}
		dl.sums {
			@apply flex flex-col gap-1 rounded-2xl sunken p-4;

			div {
				@apply flex justify-between gap-3;
			}
			dd {
				@apply tabular-nums;
			}
			div.total {
				@apply mt-1 font-display text-2xl font-extrabold;
			}
		}
	}
</style>
