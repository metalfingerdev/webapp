<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { errorText } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Switch from '#lib/ui/Switch.svelte';

	// The settings row as one form. Phone numbers show as typed; the server stores them as +91.
	const text = strings.admin.settings;
	const client = useConvexClient();
	const result = useQuery(api.store.admin.settings.get, {});

	const blank = () => ({
		businessName: '',
		legalName: '',
		phone: '',
		whatsapp: '',
		email: '',
		address: '',
		gstin: '',
		invoicePrefix: '',
		returnWindowDays: '7',
		currentSession: '',
		codEnabled: true,
		placedOrdersOpen: true
	});
	let form = $state(blank());
	let loaded = $state(false);
	$effect(() => {
		const data = result.data;
		if (!data || loaded) return;
		form = {
			businessName: data.businessName,
			legalName: data.legalName ?? '',
			phone: data.phone?.replace(/^\+91/, '') ?? '',
			whatsapp: data.whatsapp?.replace(/^\+91/, '') ?? '',
			email: data.email ?? '',
			address: data.address ?? '',
			gstin: data.gstin ?? '',
			invoicePrefix: data.invoicePrefix ?? '',
			returnWindowDays: String(data.returnWindowDays),
			currentSession: data.currentSession,
			codEnabled: data.codEnabled,
			placedOrdersOpen: data.placedOrdersOpen
		};
		loaded = true;
	});

	let error = $state('');
	let notice = $state('');
	let busy = $state(false);
	let confirmSession = $state(false);

	const save = async () => {
		busy = true;
		error = '';
		notice = '';
		try {
			await client.mutation(api.store.admin.settings.save, {
				...form,
				returnWindowDays: Number(form.returnWindowDays)
			});
			notice = text.saved;
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		if (result.data && form.currentSession.trim() !== result.data.currentSession) {
			confirmSession = true;
		} else {
			save();
		}
	};
</script>

{#if !loaded}
	<div class="bone h-96 rounded-xl"></div>
{:else}
	<form class="panel form" onsubmit={submit}>
		<div class="open" class:closed={!form.placedOrdersOpen}>
			<Switch bind:checked={form.placedOrdersOpen}>{text.open}</Switch>
			<p>{text.openHint}</p>
		</div>
		{#if result.data && !result.data.placedOrdersOpen}
			<Notice tone="warn" role="status">{text.closedNotice}</Notice>
		{/if}

		<div class="grid">
			<Field label={text.businessName}>
				<input bind:value={form.businessName} required maxlength="80" />
			</Field>
			<Field label={text.legalName} hint={text.legalNameHint}>
				<input bind:value={form.legalName} maxlength="120" />
			</Field>
			<Field label={text.phone}>
				<input bind:value={form.phone} type="tel" inputmode="tel" autocomplete="off" />
			</Field>
			<Field label={text.whatsapp} hint={text.whatsappHint}>
				<input bind:value={form.whatsapp} type="tel" inputmode="tel" autocomplete="off" />
			</Field>
			<Field label={text.email}>
				<input bind:value={form.email} type="email" maxlength="120" autocomplete="off" />
			</Field>
			<div class="wide">
				<Field label={text.address}>
					<textarea bind:value={form.address} rows="3" maxlength="300"></textarea>
				</Field>
			</div>
			<Field label={text.gstin}>
				<input bind:value={form.gstin} maxlength="15" class="uppercase" autocomplete="off" />
			</Field>
			<Field label={text.invoicePrefix} hint={text.invoicePrefixHint}>
				<input bind:value={form.invoicePrefix} maxlength="3" class="uppercase" />
			</Field>
			<p class="wide hint">{text.taxHint}</p>
			<Field label={text.returnWindow} hint={text.returnWindowHint}>
				<input bind:value={form.returnWindowDays} type="number" min="0" max="30" required />
			</Field>
			<Field label={text.session} hint={text.sessionHint}>
				<input bind:value={form.currentSession} required pattern="\d{4}-\d{2}" />
			</Field>
			<div class="wide">
				<Switch bind:checked={form.codEnabled}>{text.cod}</Switch>
			</div>
		</div>

		{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
		{#if notice}<Notice role="status">{notice}</Notice>{/if}
		<div><Button type="submit" variant="primary" disabled={busy}>{text.save}</Button></div>
	</form>

	<ConfirmDialog
		bind:open={confirmSession}
		title={text.sessionTitle}
		description={text.sessionDescription(result.data?.currentSession ?? '', form.currentSession)}
		confirmLabel={text.sessionConfirm}
		cancelLabel={text.keep}
		onconfirm={() => {
			confirmSession = false;
			save();
		}}
	/>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	.form {
		@apply flex flex-col gap-4 p-4;
	}
	.open {
		@apply flex flex-col gap-1 rounded-xl raised-success p-3;

		p {
			@apply text-sm;
		}
	}
	.open.closed {
		@apply raised-danger;
	}
	.grid {
		@apply grid gap-3 sm:grid-cols-2;
	}
	.wide {
		@apply sm:col-span-2;
	}
	.hint {
		@apply text-xs text-text-muted;
	}
</style>
