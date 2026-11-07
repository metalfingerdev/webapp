<script lang="ts">
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Pill from '#lib/ui/Pill.svelte';
	import { MAX_LINE_QUANTITY } from '#convex/model/store/cart.js';
	import { useCart } from './cart.svelte.js';
	import { formatPrice } from './format.js';
	import { strings } from './strings.js';

	// The lines of the cart, grouped under the set they came from. Shared by the drawer and /cart.
	const cart = useCart();
	const text = strings.cart;
	const view = $derived(cart.view);
	const groups = $derived.by(() => {
		if (!view) return [];
		const sets = view.sets
			.map((set) => ({
				key: set.id as string,
				heading: text.set(set.schoolName, set.label),
				lines: view.lines.filter((line) => line.fromSetId === set.id)
			}))
			.filter((group) => group.lines.length > 0);
		const known = new Set(view.sets.map((set) => set.id));
		const loose = view.lines.filter((line) => !line.fromSetId || !known.has(line.fromSetId));
		return loose.length
			? [...sets, { key: 'loose', heading: sets.length ? text.otherItems : '', lines: loose }]
			: sets;
	});
</script>

{#each groups as group (group.key)}
	<section class="group">
		{#if group.heading}<h3 class="heading">{group.heading}</h3>{/if}
		<ul class="lines">
			{#each group.lines as line (line.variantId)}
				<li class="line" class:off={line.availability === 'out'}>
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
							{#if line.variantLabel !== 'Default'}{line.variantLabel} ·
							{/if}{formatPrice(line.price)}
						</span>
						{#if line.availability === 'out'}
							<Pill tone="bad">{text.outOfStock}</Pill>
						{:else if line.availability === 'few_left'}
							<Pill tone="warn">{text.fewLeft}</Pill>
						{/if}
					</span>
					<span class="stepper">
						<button
							type="button"
							aria-label={text.decrease(line.title)}
							disabled={line.quantity <= 1}
							onclick={() => cart.setQuantity(line.variantId, line.quantity - 1)}
						>
							<MinusIcon class="size-4" aria-hidden="true" />
						</button>
						<output>{line.quantity}</output>
						<button
							type="button"
							aria-label={text.increase(line.title)}
							disabled={line.quantity >= MAX_LINE_QUANTITY || line.availability === 'out'}
							onclick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
						>
							<PlusIcon class="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							aria-label={text.remove(line.title)}
							onclick={() => cart.remove(line.variantId)}
						>
							<Trash2Icon class="size-4" aria-hidden="true" />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/each}

<style lang="postcss">
	@reference 'src/app.css';

	.group {
		@apply mb-4;
	}

	.heading {
		@apply mb-2 text-sm font-extrabold text-text-muted;
	}

	.lines {
		@apply flex flex-col gap-2;
	}

	.line {
		@apply grid grid-cols-[3rem_1fr] items-start gap-x-3 gap-y-2 panel p-2;

		&.off .name {
			@apply opacity-60;
		}
	}

	.picture {
		@apply grid h-16 w-12 place-items-center overflow-hidden rounded-md bg-midground;

		img {
			@apply size-full object-cover;
		}
	}

	.name {
		@apply flex min-w-0 flex-col items-start gap-1;

		strong {
			@apply line-clamp-2 leading-snug;
		}
	}

	.note {
		@apply text-sm text-text-muted tabular-nums;
	}

	.stepper {
		@apply col-span-2 flex items-center justify-end gap-1;

		button {
			@apply grid size-11 place-items-center rounded-full bg-midground disabled:opacity-40;
		}

		output {
			@apply w-8 text-center font-bold tabular-nums;
		}
	}
</style>
