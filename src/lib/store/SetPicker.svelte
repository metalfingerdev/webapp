<script lang="ts">
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Button from '#lib/ui/Button.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import {
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

	let { lines, setId }: { lines: Line[]; setId: string } = $props();
	const cart = useCart();
	const text = strings.schools;

	// What the parent changed; everything else follows the defaults (all ticked, single sizes chosen)
	let changes = $state<Selection>({});
	const selection = $derived<Selection>(
		Object.fromEntries(
			Object.entries(defaultSelection(lines)).map(([id, base]) => [id, { ...base, ...changes[id] }])
		)
	);
	const summary = $derived(summariseSelection(lines, selection));
	const hasChoice = (line: Line) => line.options.length > 1;
	const chosen = (line: Line) =>
		line.options.find((o) => o.variantId === selection[line.id].variantId);

	const setTicked = (line: Line, ticked: boolean) =>
		(changes[line.id] = { ...selection[line.id], ticked });
	const setSize = (line: Line, variantId: string) =>
		(changes[line.id] = { ...selection[line.id], variantId });

	// Each ticked, sized, in-stock line goes in with the set it came from
	const addSet = () =>
		cart.add(
			lines.flatMap((line) => {
				const pick = selection[line.id];
				const option = pick.ticked ? chosen(line) : undefined;
				return option && option.availability !== 'out'
					? [{ variantId: option.variantId, quantity: line.quantity, fromSetId: setId }]
					: [];
			})
		);

	const ticked = $derived(lines.filter((line) => selection[line.id].ticked).length);
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

<p class="note">{text.untick}</p>
<ul class="lines">
	{#each lines as line (line.id)}
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
					{#if line.imageUrl}
						<img
							src={line.imageUrl}
							alt=""
							width="48"
							height="64"
							loading="lazy"
							decoding="async"
						/>
					{:else}
						<BookOpenIcon class="size-5 text-text-muted" aria-hidden="true" />
					{/if}
				</span>
				<span class="name">
					<strong>{line.title}</strong>
					<span class="note">
						{#if line.quantity > 1}× {line.quantity}{/if}
						{#if option}
							{formatPrice(option.price)}
							{#if line.quantity > 1}{text.each}{/if}
						{/if}
					</span>
				</span>
			</label>
			{#if outOfStock}
				<Pill tone="bad">{strings.product.out}</Pill>
			{:else if hasChoice(line)}
				<label class="size">
					<span class="field-label">{text.size}</span>
					<select
						class="control"
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
		</li>
	{/each}
</ul>

<div class="bar">
	<div class="sum">
		<span class="note">{text.total} · {text.items(summary.count)}</span>
		<strong class="amount">{formatPrice(summary.total)}</strong>
		{#if problem}<span class="problem">{problem}</span>{/if}
	</div>
	<Button variant="primary" large disabled={ticked === 0 || summary.needSize > 0} onclick={addSet}>
		{text.addToCart}
	</Button>
</div>
<p class="note">{strings.product.inclusiveOfTax}.</p>

<style lang="postcss">
	@reference 'src/app.css';

	.note {
		@apply text-sm text-text-muted;
	}

	.lines {
		@apply my-4 flex flex-col gap-2;
	}

	.line {
		@apply flex flex-wrap items-center justify-between gap-x-4 gap-y-2 panel p-2;

		&.off .name {
			@apply opacity-50;
		}
	}

	.tick {
		@apply flex min-h-11 flex-1 cursor-pointer items-center gap-3;

		input {
			@apply size-5 shrink-0;
		}
	}

	.picture {
		@apply grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-midground;

		img {
			@apply size-full object-cover;
		}
	}

	.name {
		@apply flex min-w-0 flex-col;

		strong {
			@apply line-clamp-2 leading-snug;
		}
	}

	.size {
		@apply flex w-full flex-col sm:w-56;
	}

	/* Stays in view while the parent ticks and unticks, so the total is never off screen */
	.bar {
		@apply sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t border-border-muted bg-foreground px-4 py-3;
	}

	.sum {
		@apply flex flex-col;
	}

	.amount {
		@apply text-2xl tabular-nums;
	}

	.problem {
		@apply text-sm font-bold text-danger;
	}
</style>
