<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Doc, Id } from '#convex/_generated/dataModel.js';
	import { parseRupees, toRupeeInput } from '#lib/store/admin/money.js';
	import { errorText, formatPrice } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import Switch from '#lib/ui/Switch.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';

	// Delivery zones: a card each, an edit modal with the zone's pincodes. New areas are new zones.
	const text = strings.admin.settings;
	const client = useConvexClient();
	const zones = useQuery(api.store.admin.zones.list, {});
	const hasFallback = $derived(zones.data?.some((zone) => zone.isFallback && zone.isActive));

	type Form = {
		name: string;
		method: 'local' | 'courier';
		fee: string;
		freeFrom: string;
		estimate: string;
		isFallback: boolean;
		isActive: boolean;
	};
	let open = $state(false);
	let editing = $state<Id<'deliveryZones'> | undefined>();
	let form = $state<Form>({
		name: '',
		method: 'local',
		fee: '',
		freeFrom: '',
		estimate: '',
		isFallback: false,
		isActive: true
	});
	let pincodeText = $state('');
	let error = $state('');
	let notice = $state('');
	let busy = $state(false);
	let confirmNoFallback = $state(false);

	const listed = useQuery(api.store.admin.zones.pincodes, () =>
		open && editing ? { zoneId: editing } : 'skip'
	);
	let pincodesFor = $state<string | undefined>();
	$effect(() => {
		if (editing && listed.data && pincodesFor !== editing) {
			pincodeText = listed.data.join(', ');
			pincodesFor = editing;
		}
	});

	const edit = (zone?: Doc<'deliveryZones'>) => {
		editing = zone?._id;
		pincodesFor = undefined;
		pincodeText = '';
		error = '';
		notice = '';
		form = zone
			? {
					name: zone.name,
					method: zone.method,
					fee: toRupeeInput(zone.fee),
					freeFrom: toRupeeInput(zone.freeFrom),
					estimate: zone.estimate,
					isFallback: zone.isFallback,
					isActive: zone.isActive
				}
			: {
					name: '',
					method: 'local',
					fee: '',
					freeFrom: '',
					estimate: '',
					isFallback: false,
					isActive: true
				};
		open = true;
	};

	const run = async (action: () => Promise<unknown>) => {
		busy = true;
		error = '';
		notice = '';
		try {
			await action();
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	const saveZone = () =>
		run(async () => {
			const fee = parseRupees(form.fee);
			const freeFrom = parseRupees(form.freeFrom);
			if (typeof fee !== 'number' || typeof freeFrom !== 'number') throw new Error(text.badAmount);
			editing = await client.mutation(api.store.admin.zones.save, {
				zoneId: editing,
				...form,
				fee,
				freeFrom
			});
			notice = text.saved;
		});

	// Saving would leave no active fallback: this zone is the only one and is being taken off
	const leavesNoFallback = () =>
		!(form.isFallback && form.isActive) &&
		!zones.data?.some((zone) => zone._id !== editing && zone.isFallback && zone.isActive);

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		if (hasFallback && leavesNoFallback()) confirmNoFallback = true;
		else saveZone();
	};

	const savePincodes = () =>
		run(async () => {
			if (!editing) return;
			const n = await client.mutation(api.store.admin.zones.setPincodes, {
				zoneId: editing,
				text: pincodeText
			});
			notice = text.pincodesSaved(n);
		});
</script>

<section class="flex flex-col gap-3">
	<div class="head">
		<p class="text-text-muted text-sm">{text.zonesIntro}</p>
		<Button onclick={() => edit()}>
			<PlusIcon size={18} aria-hidden="true" />
			{text.addZone}
		</Button>
	</div>
	{#if zones.data && !hasFallback}
		<Notice tone="warn" role="alert">{text.noFallback}</Notice>
	{/if}

	{#if !zones.data}
		<div class="bone h-24 rounded-xl"></div>
	{:else}
		<ul class="zones">
			{#each zones.data as zone (zone._id)}
				<li>
					<button type="button" class="zone press" onclick={() => edit(zone)}>
						<span class="flex flex-wrap items-center gap-2">
							<strong>{zone.name}</strong>
							{#if zone.isFallback}<Pill>{text.fallbackTag}</Pill>{/if}
							{#if !zone.isActive}<Pill tone="warn">{text.hidden}</Pill>{/if}
						</span>
						<span class="meta">{text.methods[zone.method]}</span>
						<span class="meta">
							{text.feeLine(formatPrice(zone.fee), formatPrice(zone.freeFrom))}
						</span>
						<span class="meta">{zone.estimate}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<Modal bind:open title={editing ? text.editZone : text.addZone} closeLabel={text.close}>
	<form class="flex flex-col gap-3" onsubmit={submit}>
		<Field label={text.zoneName}>
			<input bind:value={form.name} required maxlength="60" />
		</Field>
		<Field label={text.method}>
			<select bind:value={form.method}>
				<option value="local">{text.methods.local}</option>
				<option value="courier">{text.methods.courier}</option>
			</select>
		</Field>
		<div class="grid grid-cols-2 gap-3">
			<Field label={text.fee}>
				<input bind:value={form.fee} inputmode="decimal" required />
			</Field>
			<Field label={text.freeFrom} hint={text.freeFromHint}>
				<input bind:value={form.freeFrom} inputmode="decimal" required />
			</Field>
		</div>
		<Field label={text.estimate} hint={text.estimateHint}>
			<input bind:value={form.estimate} required maxlength="100" />
		</Field>
		<Switch bind:checked={form.isFallback}>{text.fallback}</Switch>
		<p class="text-text-muted -mt-2 text-xs">{text.fallbackHint}</p>
		<Switch bind:checked={form.isActive}>{text.active}</Switch>
		<div><Button type="submit" variant="primary" disabled={busy}>{text.saveZone}</Button></div>
	</form>

	{#if editing}
		<div class="pincodes">
			<Field label={text.pincodes} hint={text.pincodesHint}>
				<textarea bind:value={pincodeText} rows="5" inputmode="numeric"></textarea>
			</Field>
			<div><Button disabled={busy} onclick={savePincodes}>{text.savePincodes}</Button></div>
		</div>
	{/if}

	{#if error}<div class="mt-3"><Notice tone="bad" role="alert">{error}</Notice></div>{/if}
	{#if notice}<div class="mt-3"><Notice role="status">{notice}</Notice></div>{/if}
</Modal>

<ConfirmDialog
	bind:open={confirmNoFallback}
	title={text.lastFallbackTitle}
	description={text.lastFallbackDescription}
	confirmLabel={text.lastFallbackConfirm}
	cancelLabel={text.keep}
	onconfirm={() => {
		confirmNoFallback = false;
		saveZone();
	}}
/>

<style lang="postcss">
	@reference 'src/app.css';

	.head {
		@apply flex flex-wrap items-center justify-between gap-2;
	}
	.zones {
		@apply grid gap-2 md:grid-cols-2;
	}
	.zone {
		@apply flex min-h-11 w-full flex-col items-start gap-1 rounded-xl raised p-3 text-left;
	}
	.meta {
		@apply text-sm text-text-muted;
	}
	.pincodes {
		@apply mt-4 flex flex-col gap-3 border-t border-border-muted pt-4;
	}
</style>
