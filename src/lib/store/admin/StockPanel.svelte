<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '#convex/_generated/api.js';
	import { errorText, formatDate, formatTime } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Notice from '#lib/ui/Notice.svelte';

	type Variant = NonNullable<
		FunctionReturnType<typeof api.store.admin.products.get>
	>['variants'][number];

	// One size's stock: exact number, what open orders hold, the three ways to change it, the log.
	let { variant }: { variant: Variant } = $props();
	const text = strings.admin.stock;
	const client = useConvexClient();

	type Mode = 'received' | 'damaged' | 'count';
	let mode = $state<Mode>('received');
	let amount = $state('');
	// The stock the screen showed when the count began: the server refuses if it moved since.
	let shownStock = $state(0);
	let error = $state('');
	let busy = $state(false);

	const pick = (next: Mode) => {
		mode = next;
		amount = '';
		error = '';
		shownStock = variant.stock;
	};

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		const n = Number(amount);
		if (!Number.isInteger(n) || n < 0 || (mode !== 'count' && n === 0)) {
			error = text.quantity;
			return;
		}
		busy = true;
		error = '';
		try {
			if (mode === 'count') {
				await client.mutation(api.store.admin.stock.count, {
					variantId: variant._id,
					counted: n,
					shownStock
				});
			} else {
				await client.mutation(api.store.admin.stock.adjust, {
					variantId: variant._id,
					delta: mode === 'received' ? n : -n,
					reason: mode
				});
			}
			amount = '';
			shownStock = variant.stock;
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};
</script>

<div class="stock">
	<p class="now">
		<span class="number">{variant.stock}</span>
		<span>{text.current}</span>
	</p>
	{#if variant.held > 0}<p class="held">{text.held(variant.held)}</p>{/if}

	<div class="modes" role="group" aria-label={text.title}>
		{#each ['received', 'damaged', 'count'] as const as m (m)}
			<button type="button" class="mode" class:on={mode === m} onclick={() => pick(m)}>
				{text[m]}
			</button>
		{/each}
	</div>

	<form class="change" onsubmit={submit}>
		<Field
			label={mode === 'count' ? text.counted : text.quantity}
			hint={mode === 'count' ? text.countHint : undefined}
		>
			<input
				bind:value={amount}
				inputmode="numeric"
				onfocus={() => {
					if (mode === 'count' && amount === '') shownStock = variant.stock;
				}}
			/>
		</Field>
		<Button type="submit" variant="primary" disabled={busy || amount === ''}>{text.apply}</Button>
	</form>
	{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}

	<h3>{text.log}</h3>
	{#if variant.log.length === 0}
		<p class="text-text-muted text-sm">{text.noLog}</p>
	{:else}
		<ol class="log">
			{#each variant.log as entry (entry._id)}
				<li>
					<span class="delta" class:minus={entry.delta < 0}>
						{entry.delta > 0 ? '+' : ''}{entry.delta}
					</span>
					<span class="reason">
						{text.reasons[entry.reason]}{entry.byAdmin ? '' : ` · ${text.system}`}
					</span>
					<span class="after">{entry.stockAfter}</span>
					<span class="when">{formatDate(entry.at)}, {formatTime(entry.at)}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.stock {
		@apply flex flex-col gap-3;
	}
	.now {
		@apply flex items-baseline gap-2;
	}
	.number {
		@apply text-3xl font-extrabold;
	}
	.held {
		@apply -mt-2 text-sm text-text-muted;
	}
	.modes {
		@apply flex gap-1 rounded-xl sunken p-1;
	}
	.mode {
		@apply min-h-10 flex-1 rounded-lg px-2 text-sm font-bold text-text-muted;

		&.on {
			@apply raised text-text;
		}
	}
	.change {
		@apply flex items-end gap-2;

		& > :first-child {
			@apply flex-1;
		}
	}
	h3 {
		@apply mt-2 text-sm font-extrabold;
	}
	.log li {
		@apply grid grid-cols-[3rem_1fr_2.5rem] gap-x-2 border-b border-border-muted py-2 text-sm last:border-b-0;
	}
	.delta {
		@apply font-extrabold text-success;

		&.minus {
			@apply text-danger;
		}
	}
	.after {
		@apply text-right font-bold;
	}
	.when {
		@apply col-span-3 text-xs text-text-muted;
	}
</style>
