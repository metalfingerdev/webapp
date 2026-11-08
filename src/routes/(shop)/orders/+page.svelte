<script lang="ts">
	import { resolve } from '$app/paths';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { useRequireSignIn } from '#lib/auth/requireSignIn.svelte.js';
	import { formatDate, formatPrice } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Pill from '#lib/ui/Pill.svelte';

	useRequireSignIn();
	const text = strings.orders;
	const orders = useQuery(api.store.orders.myOrders, {});
	const tone = (status: string) =>
		status === 'cancelled' ? 'bad' : status === 'delivered' ? 'ok' : 'warn';
</script>

<svelte:head><title>{text.title} · {strings.brand}</title></svelte:head>

<PageHead title={text.title} />
<div class="orders">
	{#if orders.data?.length === 0}
		<p class="note">{text.empty}</p>
		<Button href={resolve('/(shop)/shop')} variant="primary">{text.browse}</Button>
	{:else if orders.data}
		<ul class="list">
			{#each orders.data as order (order.number)}
				<li>
					<a class="order" href={resolve('/(shop)/orders/[number]', { number: order.number })}>
						<span class="top">
							<strong>{order.number}</strong>
							<Pill tone={tone(order.status)}>{text.status[order.status]}</Pill>
						</span>
						<span class="note">
							{formatDate(order.placedAt)} · {text.items(order.itemCount)} · {formatPrice(
								order.total
							)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.orders {
		@apply flex flex-col items-start gap-4 pb-8;

		p.note {
			@apply text-text-muted;
		}
		ul.list {
			@apply grid w-full gap-4 sm:grid-cols-2;
		}
		a.order {
			@apply flex min-h-11 press flex-col gap-2 rounded-3xl raised p-5;

			span.top {
				@apply flex items-center justify-between gap-3;

				strong {
					@apply font-display text-lg;
				}
			}
			span.note {
				@apply text-sm text-text-muted tabular-nums;
			}
		}
	}
</style>
