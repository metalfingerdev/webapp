<script lang="ts">
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Button from '#lib/ui/Button.svelte';
	import Media from '#lib/ui/Media.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import { MAX_LINE_QUANTITY } from '#convex/model/store/cart.js';
	import {
		chosenQuantity,
		defaultSelection,
		summariseSelection,
		type Selection
	} from '#convex/model/store/setSelection.js';
	import { useCart } from './cart.svelte.js';
	import { formatPrice } from './format.js';
	import { strings } from './strings.js';

	type Line = {
		id: string;
		title: string;
		imageUrl: string | null;
		quantity: number;
		options: {
			variantId: string;
			label: string;
			price: number;
			availability: 'in_stock' | 'few_left' | 'out';
		}[];
	};

	// `extras` are other things the parent may add with the set (the school's other products and
	// stationery); they start unticked. Ticked extras go in with the set, like its own lines.
	let { lines, extras = [], setId }: { lines: Line[]; extras?: Line[]; setId: string } = $props();
	const cart = useCart();
	const text = strings.schools;
	const all = $derived([...lines, ...extras]);

	// What the parent changed; everything else follows the defaults (set lines ticked, extras not,
	// single sizes chosen, the set's own quantities)
	let changes = $state<Selection>({});
	const selection = $derived.by<Selection>(() => {
		const base = defaultSelection(all);
		for (const extra of extras) base[extra.id] = { ...base[extra.id], ticked: false };
		return Object.fromEntries(
			Object.entries(base).map(([id, pick]) => [id, { ...pick, ...changes[id] }])
		);
	});
	const summary = $derived(summariseSelection(all, selection));

	// When this set is already in the cart, start from what is there and offer "Update cart", so the
	// cart's "Edit set" brings the parent back to their own choices. Once, when the cart has loaded.
	let editing = $state(false);
	let seeded = false;
	$effect(() => {
		if (seeded || cart.loading) return;
		seeded = true;
		const inCart = cart.linesOfSet(setId);
		if (inCart.length === 0) return;
		const next: Selection = {};
		for (const line of all) {
			const found = inCart.find((c) => line.options.some((o) => o.variantId === c.variantId));
			next[line.id] = found
				? { ticked: true, variantId: found.variantId, quantity: found.quantity }
				: { ...selection[line.id], ticked: false };
		}
		changes = next;
		editing = true;
	});
	const hasChoice = (line: Line) => line.options.length > 1;
	const chosen = (line: Line) =>
		line.options.find((o) => o.variantId === selection[line.id].variantId);

	const setTicked = (line: Line, ticked: boolean) =>
		(changes[line.id] = { ...selection[line.id], ticked });
	const setSize = (line: Line, variantId: string) =>
		(changes[line.id] = { ...selection[line.id], variantId });
	const quantityOf = (line: Line) => chosenQuantity(line, selection[line.id]);
	const setQuantity = (line: Line, quantity: number) =>
		(changes[line.id] = {
			...selection[line.id],
			quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity))
		});

	// Each ticked, sized, in-stock line goes in with the set it came from. The first press adds; once
	// the set is in the cart, the button updates it instead, so pressing twice never doubles it.
	const addSet = async () => {
		const picked = all.flatMap((line) => {
			const pick = selection[line.id];
			const option = pick.ticked ? chosen(line) : undefined;
			return option && option.availability !== 'out'
				? [{ variantId: option.variantId, quantity: quantityOf(line), fromSetId: setId }]
				: [];
		});
		if (editing) await cart.replaceSet(setId, picked);
		else await cart.add(picked);
		editing = true;
	};

	const ticked = $derived(all.filter((line) => selection[line.id].ticked).length);
	const problem = $derived(
		ticked === 0
			? text.nothingTicked
			: summary.needSize > 0
				? text.needSize(summary.needSize)
				: summary.unavailable > 0
					? text.unavailable(summary.unavailable)
					: ''
	);
</script>

{#snippet row(line: Line)}
	{@const outOfStock = line.options.every((o) => o.availability === 'out')}
	{@const option = chosen(line)}
	<li class="line" class:off={!selection[line.id].ticked}>
		<label class="tick">
			<input
				type="checkbox"
				checked={selection[line.id].ticked}
				disabled={outOfStock}
				onchange={(event) => setTicked(line, event.currentTarget.checked)}
			/>
			<span class="picture">
				<Media
					src={line.imageUrl}
					ratio="3 / 4"
					slot="product-thumb"
					icon={BookOpenIcon}
					iconSize={18}
					width={48}
					height={64}
				/>
			</span>
			<span class="name">
				<strong>{line.title}</strong>
				<span class="note">
					{#if quantityOf(line) > 1}× {quantityOf(line)}{/if}
					{#if option}
						{formatPrice(option.price)}
						{#if quantityOf(line) > 1}{text.each}{/if}
					{/if}
				</span>
			</span>
		</label>
		{#if outOfStock}
			<Pill tone="bad">{strings.product.out}</Pill>
		{:else if hasChoice(line)}
			<label class="size">
				<span class="caption">{text.size}</span>
				<select
					value={selection[line.id].variantId ?? ''}
					onchange={(event) => setSize(line, event.currentTarget.value)}
				>
					<option value="" disabled>{text.chooseSize}</option>
					{#each line.options as o (o.variantId)}
						<option value={o.variantId} disabled={o.availability === 'out'}>
							{o.label} · {formatPrice(o.price)}{o.availability === 'out'
								? ` · ${strings.product.out}`
								: ''}
						</option>
					{/each}
				</select>
			</label>
		{:else if option?.availability === 'few_left'}
			<Pill tone="warn">{strings.product.fewLeft}</Pill>
		{/if}
		<!-- Always there (disabled while unticked), so ticking never changes the row's height -->
		{#if !outOfStock}
			<span class="stepper">
				<span class="caption">{text.quantity}</span>
				<button
					type="button"
					aria-label={strings.cart.decrease(line.title)}
					disabled={!selection[line.id].ticked || quantityOf(line) <= 1}
					onclick={() => setQuantity(line, quantityOf(line) - 1)}
				>
					<MinusIcon size={16} aria-hidden="true" />
				</button>
				<output>{quantityOf(line)}</output>
				<button
					type="button"
					aria-label={strings.cart.increase(line.title)}
					disabled={!selection[line.id].ticked || quantityOf(line) >= MAX_LINE_QUANTITY}
					onclick={() => setQuantity(line, quantityOf(line) + 1)}
				>
					<PlusIcon size={16} aria-hidden="true" />
				</button>
			</span>
		{/if}
	</li>
{/snippet}

<div class="set-picker">
	<p class="note">{editing ? text.inCart : text.untick}</p>
	<ul class="lines">
		{#each lines as line (line.id)}
			{@render row(line)}
		{/each}
	</ul>

	{#if extras.length}
		<section class="more">
			<h2 class="more-title">{text.more}</h2>
			<p class="note">{text.moreHint}</p>
			<ul class="lines">
				{#each extras as line (line.id)}
					{@render row(line)}
				{/each}
			</ul>
		</section>
	{/if}

	<div class="bar">
		<div class="sum">
			<span class="note">{text.total} · {text.items(summary.count)}</span>
			<strong class="amount">{formatPrice(summary.total)}</strong>
			{#if problem}<span class="problem">{problem}</span>{/if}
		</div>
		<Button
			variant="primary"
			large
			disabled={ticked === 0 || summary.needSize > 0}
			onclick={addSet}
		>
			{editing ? text.updateCart : text.addToCart}
		</Button>
	</div>
	<p class="note">{strings.product.inclusiveOfTax}.</p>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.set-picker {
		@apply flex flex-col;

		.note {
			@apply text-sm text-text-muted;
		}
		ul.lines {
			@apply my-4 flex flex-col gap-3;
		}
		section.more {
			@apply mt-10;

			h2.more-title {
				@apply type-headline text-3xl;
			}
		}

		/* Stays in view while the parent ticks and unticks, so the total is never off screen */
		div.bar {
			@apply sticky bottom-3 z-20 my-4 flex items-center justify-between gap-3 rounded-[1.75rem] floating px-5 py-3;

			div.sum {
				@apply flex flex-col;
			}
			strong.amount {
				@apply font-display text-2xl tabular-nums;
			}
			span.problem {
				@apply text-sm font-bold text-danger;
			}
		}
	}

	/* One line of the set (a snippet, so it is styled on its own) */
	li.line {
		@apply flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-3xl raised p-3;

		&.off {
			@apply sunken;

			span.name {
				@apply opacity-50;
			}
		}

		label.tick {
			@apply flex min-h-11 flex-1 cursor-pointer items-center gap-3;

			input {
				@apply size-5 shrink-0 rounded-md border-0 text-primary shadow-inset;
			}
		}
		span.picture {
			@apply w-12 shrink-0;
			--media-radius: 0.625rem;
		}
		span.name {
			@apply flex min-w-0 flex-col;

			strong {
				@apply line-clamp-2 leading-snug;
			}
			span.note {
				@apply text-sm text-text-muted;
			}
		}

		span.caption {
			@apply text-sm font-bold;
		}
		label.size {
			@apply flex w-full flex-col gap-1 sm:w-56;

			select {
				@apply min-h-11 w-full rounded-xl border-0 sunken px-4 text-sm text-text;
			}
		}

		span.stepper {
			@apply flex w-full items-center justify-end gap-1.5;

			span.caption {
				@apply mr-auto font-normal text-text-muted;
			}
			button {
				@apply grid size-11 press place-items-center rounded-full raised disabled:opacity-40;
			}
			output {
				@apply w-8 text-center font-bold tabular-nums;
			}
		}
	}
</style>
