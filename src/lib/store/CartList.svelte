<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Media from '#lib/ui/Media.svelte';
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
				edit: resolve('/(shop)/schools/[school]/[set]', { school: set.schoolSlug, set: set.id }),
				lines: view.lines.filter((line) => line.fromSetId === set.id)
			}))
			.filter((group) => group.lines.length > 0);
		const known = new Set(view.sets.map((set) => set.id));
		const loose = view.lines.filter((line) => !line.fromSetId || !known.has(line.fromSetId));
		return loose.length
			? [
					...sets,
					{ key: 'loose', heading: sets.length ? text.otherItems : '', edit: '', lines: loose }
				]
			: sets;
	});
</script>

<div class="cart-list">
	{#each groups as group (group.key)}
		<section class="group">
			{#if group.heading}
				<div class="group-head">
					<h3 class="heading">{group.heading}</h3>
					{#if group.edit}<a class="edit" href={group.edit}>{text.editSet}</a>{/if}
				</div>
			{/if}
			<ul class="lines">
				{#each group.lines as line (line.variantId)}
					<li class="line" class:off={line.availability === 'out'}>
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
								<MinusIcon size={16} aria-hidden="true" />
							</button>
							<output>{line.quantity}</output>
							<button
								type="button"
								aria-label={text.increase(line.title)}
								disabled={line.quantity >= MAX_LINE_QUANTITY || line.availability === 'out'}
								onclick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
							>
								<PlusIcon size={16} aria-hidden="true" />
							</button>
							<button
								type="button"
								aria-label={text.remove(line.title)}
								onclick={() => cart.remove(line.variantId)}
							>
								<Trash2Icon size={16} aria-hidden="true" />
							</button>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.cart-list {
		@apply flex flex-col gap-6;

		div.group-head {
			@apply mb-2 flex items-center justify-between gap-3;

			h3.heading {
				@apply type-kicker;
			}
			a.edit {
				@apply inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent;
			}
		}

		ul.lines {
			@apply flex flex-col gap-3;
		}

		li.line {
			@apply grid grid-cols-[3rem_1fr] items-start gap-x-3 gap-y-2 rounded-3xl raised p-3;

			&.off span.name {
				@apply opacity-60;
			}
			span.picture {
				--media-radius: 0.625rem;
			}
			span.name {
				@apply flex min-w-0 flex-col items-start gap-1;

				strong {
					@apply line-clamp-2 leading-snug;
				}
			}
			span.note {
				@apply text-sm text-text-muted tabular-nums;
			}
			span.stepper {
				@apply col-span-2 flex items-center justify-end gap-1.5;

				button {
					@apply grid size-11 press place-items-center rounded-full raised disabled:opacity-40;
				}
				output {
					@apply w-8 text-center font-bold tabular-nums;
				}
			}
		}
	}
</style>
