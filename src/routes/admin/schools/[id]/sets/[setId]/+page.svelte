<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import SetFields from '#lib/store/admin/SetFields.svelte';
	import { setState, toSetInput, type SetForm } from '#lib/store/admin/setForm.js';
	import { errorText, formatPrice } from '#lib/store/format.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	const text = strings.admin.sets;
	const client = useConvexClient();
	const schoolId = $derived(page.params.id as Id<'schools'>);
	const setId = $derived(page.params.setId as Id<'schoolSets'>);
	const result = useQuery(api.store.admin.sets.get, () => ({ setId }));
	const set = $derived(result.data);

	// Filled once per set, so live updates never wipe an edit in progress
	let form = $state<SetForm | undefined>();
	let filledFor = $state<string | undefined>();
	$effect(() => {
		if (set && filledFor !== set._id) {
			form = setState(set);
			filledFor = set._id;
		}
	});

	const total = $derived(
		(set?.lines ?? []).reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0)
	);
	const quantities = Array.from({ length: 10 }, (_, i) => i + 1);

	let error = $state('');
	let saved = $state(false);
	let busy = $state(false);
	const run = async (action: () => Promise<unknown>) => {
		busy = true;
		error = '';
		saved = false;
		try {
			await action();
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	const save = (event: SubmitEvent) => {
		event.preventDefault();
		if (!form) return;
		const input = toSetInput(form);
		return run(async () => {
			await client.mutation(api.store.admin.sets.update, { setId, ...input });
			saved = true;
		});
	};

	// Adding lines: search the catalogue, pick a size for a book with several
	let typed = $state('');
	let q = $state('');
	$effect(() => {
		const value = typed.trim();
		const timer = setTimeout(() => (q = value), 250);
		return () => clearTimeout(timer);
	});
	const found = useQuery(api.store.admin.products.search, () => (q ? { q } : 'skip'));
	const sizeFor = $state<Record<string, string>>({});
	const fits = (kind: string) =>
		set?.type === 'uniform' ? kind === 'uniform' : kind !== 'uniform';
	const inSet = (productId: string) => set?.lines.some((line) => line.productId === productId);

	const addLine = (productId: Id<'products'>, variants: { _id: Id<'productVariants'> }[]) =>
		run(() =>
			client.mutation(api.store.admin.sets.addLine, {
				setId,
				productId,
				variantId:
					set?.type === 'books' && variants.length > 1
						? ((sizeFor[productId] || variants[0]._id) as Id<'productVariants'>)
						: undefined,
				quantity: 1
			})
		);
</script>

<svelte:head>
	<title>{set?.label ?? text.notFound} · {strings.admin.title}</title>
</svelte:head>



<div class="set-page">
	{#if result.isLoading || (set && !form)}
		<div class="waiting"><Spinner /></div>
	{:else if !set || !form}
		<Notice tone="warn" role="status">{text.notFound}</Notice>
	{:else}
		<PageHead
			title={set.label}
			kicker={`${text.types[set.type]} · ${set.session}`}
			size="headline"
			back={{
				href: resolve('/admin/schools/[id]', { id: schoolId }),
				label: set.schoolName ?? strings.admin.schools.back
			}}
		>
				{#if set.isActive}
					<Pill tone="ok">{text.live}</Pill>
					<Button
						disabled={busy}
						onclick={() =>
							run(() => client.mutation(api.store.admin.sets.setActive, { setId, isActive: false }))}
					>
						{text.unpublish}
					</Button>
				{:else}
					<Pill>{text.hidden}</Pill>
					<Button
						variant="primary"
						disabled={busy || !!set.problem}
						onclick={() =>
							run(() => client.mutation(api.store.admin.sets.setActive, { setId, isActive: true }))}
					>
						{text.publish}
						</Button>
						{/if}
						</PageHead>

		{#if set.problem}
			<Notice tone="warn" role="status">
				<strong>{text.problemTitle}:</strong>
				{set.problem}
			</Notice>
		{/if}
		{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}

		<div class="layout">
			<section class="card">
				<div class="lines-head">
					<h2>{text.items}</h2>
					<span class="sum">{text.total}: {formatPrice(total)}</span>
				</div>
				{#if set.lines.length === 0}
					<p class="empty">{text.noLines}</p>
				{:else}
					<ol class="lines">
						{#each set.lines as line, i (line._id)}
							<li class="line">
								<div class="info">
									<span class="title">{line.title}</span>
									<span class="meta">
										{line.size ?? text.anySize}
										{#if line.price !== null}· {formatPrice(line.price)}{/if}
										{#if line.stock !== null}· {text.inStock(line.stock)}{/if}
									</span>
									{#if line.hidden}<Pill tone="bad">{text.lineHidden}</Pill>
									{:else if line.outOfStock}<Pill tone="warn">{text.lineOut}</Pill>{/if}
								</div>
								<label class="qty">
									<span class="sr-only">{text.quantity}</span>
									<select
										value={line.quantity}
										disabled={busy}
										onchange={(event) =>
											run(() =>
												client.mutation(api.store.admin.sets.updateLine, {
													lineId: line._id,
													quantity: Number(event.currentTarget.value)
												})
											)}
									>
										{#each quantities as n (n)}<option value={n}>{n}</option>{/each}
									</select>
								</label>
								<Button
									icon
									aria-label={text.up}
									disabled={busy || i === 0}
									onclick={() =>
										run(() =>
											client.mutation(api.store.admin.sets.moveLine, {
												lineId: line._id,
												direction: 'up'
											})
										)}
								>
									<ArrowUpIcon size={18} aria-hidden="true" />
								</Button>
								<Button
									icon
									aria-label={text.down}
									disabled={busy || i === set.lines.length - 1}
									onclick={() =>
										run(() =>
											client.mutation(api.store.admin.sets.moveLine, {
												lineId: line._id,
												direction: 'down'
											})
										)}
								>
									<ArrowDownIcon size={18} aria-hidden="true" />
								</Button>
								<Button
									icon
									variant="danger"
									aria-label={text.remove}
									disabled={busy}
									onclick={() =>
										run(() => client.mutation(api.store.admin.sets.removeLine, { lineId: line._id }))}
								>
									<Trash2Icon size={18} aria-hidden="true" />
								</Button>
							</li>
						{/each}
					</ol>
				{/if}

				<h3>{text.add}</h3>
				<label class="search">
					<SearchIcon size={18} aria-hidden="true" />
					<span class="sr-only">{text.search}</span>
					<input type="search" bind:value={typed} placeholder={text.search} />
				</label>
				{#if q}
					{#if found.isLoading}
						<div class="bone searching"></div>
					{:else if (found.data ?? []).length === 0}
						<p class="empty">{text.noResults}</p>
					{:else}
						<ul class="results">
							{#each found.data ?? [] as product (product._id)}
								<li class="result">
									<div class="info">
										<span class="title">{product.title}</span>
										<span class="meta">{product.category}</span>
									</div>
									{#if !fits(product.kind)}
										<span class="wrong">{text.wrongKind}</span>
									{:else}
										{#if set.type === 'books' && product.variants.length > 1}
											<label class="qty">
												<span class="sr-only">{text.pickSize}</span>
												<select bind:value={sizeFor[product._id]}>
													{#each product.variants as v (v._id)}<option value={v._id}>{v.label}</option
														>{/each}
												</select>
											</label>
										{/if}
										<Button
											disabled={busy || (set.type === 'uniform' && inSet(product._id))}
											onclick={() => addLine(product._id, product.variants)}
										>
											{text.addLine}
										</Button>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</section>

			<form class="card" onsubmit={save}>
				<h2>{text.details}</h2>
				<SetFields bind:form typeLocked />
				<div class="save">
					<Button type="submit" variant="primary" disabled={busy}>{text.save}</Button>
					{#if saved}<span class="saved" role="status">{text.saved}</span>{/if}
				</div>
			</form>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.set-page {
		@apply flex flex-col gap-4;

		div.waiting {
			@apply flex justify-center py-16;
		}
		div.layout {
			@apply grid items-start gap-5 lg:grid-cols-[3fr_2fr];
		}
		:is(section, form).card {
			@apply flex flex-col gap-3 rounded-[1.75rem] p-5 raised;
		}
		h2 {
			@apply type-title;
		}
		h3 {
			@apply mt-4 type-kicker;
		}
		div.lines-head {
			@apply flex flex-wrap items-center justify-between gap-2;

			span.sum {
				@apply font-display font-bold;
			}
		}
		p.empty {
			@apply text-sm text-text-muted;
		}
		:is(ol.lines, ul.results) {
			@apply flex flex-col gap-2;
		}
		:is(li.line, li.result) {
			@apply flex flex-wrap items-center gap-2 rounded-2xl p-2 pl-4 sunken;

			div.info {
				@apply flex min-w-40 flex-1 flex-col items-start gap-0.5;
			}
			span.title {
				@apply text-sm font-bold;
			}
			span.meta {
				@apply text-xs text-text-muted;
			}
			span.wrong {
				@apply text-xs text-text-muted;
			}
			label.qty select {
				@apply min-h-11 w-auto rounded-full border-0 control raised;
			}
		}
		label.search {
			@apply flex min-h-11 items-center gap-2 rounded-full px-4 text-text-muted sunken;

			input {
				@apply min-w-0 flex-1 border-0 bg-transparent text-sm text-text outline-none focus:ring-0;
			}
		}
		div.searching {
			@apply h-12 rounded-2xl;
		}
		div.save {
			@apply mt-2 flex items-center gap-3;

			span.saved {
				@apply text-sm font-bold text-success;
			}
		}
	}
</style>
