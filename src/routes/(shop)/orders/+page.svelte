<script lang="ts">
	import { resolve } from '$app/paths';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { useRequireSignIn } from '#lib/auth/requireSignIn.svelte.js';
	import { formatDate, formatPrice } from '#lib/store/format.js';
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

<h1 class="title">{text.title}</h1>
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

<style lang="postcss">
	@reference 'src/app.css';

	.title {
		@apply mb-4 text-3xl font-extrabold;
	}

	.note {
		@apply text-sm text-text-muted tabular-nums;
	}

	p.note {
		@apply mb-4 text-base;
	}

	.list {
		@apply flex flex-col gap-2 pb-8;
	}

	.order {
		@apply flex min-h-11 flex-col gap-1 panel p-3;
	}

	.top {
		@apply flex items-center justify-between gap-3;
	}
</style>
