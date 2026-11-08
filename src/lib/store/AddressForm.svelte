<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import Button from '#lib/ui/Button.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { errorText } from './format.js';
	import { strings } from './strings.js';

	// Adds an address, or edits one. The server checks every field again.
	type Existing = {
		id: Id<'addresses'>;
		name: string;
		phone: string;
		line1: string;
		line2?: string;
		landmark?: string;
		city: string;
		state: string;
		pincode: string;
		isDefault: boolean;
	};
	let {
		existing,
		first = false,
		onsaved,
		oncancel
	}: {
		existing?: Existing;
		/** The customer's first address: it becomes the default, so there is no checkbox */
		first?: boolean;
		onsaved: (id: Id<'addresses'>) => void;
		oncancel?: () => void;
	} = $props();

	const text = strings.checkout;
	const client = useConvexClient();
	// A new address starts with the account's name and number (still editable: the parcel may be
	// for someone else). A phone-only account's name is its number, which is no name, so skip it.
	const me = useQuery(api.users.queries.getActiveUser, {});
	const digits = (value: string) => value.replace(/\D/g, '');
	const accountName = $derived(
		me.data?.name && digits(me.data.name).length < 10 ? me.data.name : ''
	);
	const accountPhone = $derived(me.data?.phoneNumber ? digits(me.data.phoneNumber).slice(-10) : '');
	// The saved phone is +91XXXXXXXXXX; the field shows the 10 digits
	const initial = $derived({
		name: existing?.name ?? accountName,
		phone: existing ? existing.phone.replace(/^\+91/, '') : accountPhone,
		line1: existing?.line1 ?? '',
		line2: existing?.line2 ?? '',
		landmark: existing?.landmark ?? '',
		city: existing?.city ?? '',
		state: existing?.state ?? '',
		pincode: existing?.pincode ?? '',
		makeDefault: existing?.isDefault ?? false
	});
	let draft = $state<Partial<typeof initial>>({});
	const value = $derived({ ...initial, ...draft });
	let saving = $state(false);
	let error = $state('');

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		saving = true;
		error = '';
		try {
			onsaved(await client.mutation(api.store.addresses.save, { id: existing?.id, ...value }));
		} catch (e) {
			error = errorText(e, 'Could not save the address. Please check it and try again.');
		} finally {
			saving = false;
		}
	};
</script>

<form class="form" onsubmit={submit}>
	<label class="field">
		<span class="caption">{text.name}</span>
		<input
			autocomplete="name"
			required
			value={value.name}
			oninput={(e) => (draft.name = e.currentTarget.value)}
		/>
	</label>
	<label class="field">
		<span class="caption">{text.phone}</span>
		<input
			type="tel"
			inputmode="numeric"
			autocomplete="tel-national"
			required
			value={value.phone}
			oninput={(e) => (draft.phone = e.currentTarget.value)}
		/>
	</label>
	<label class="field wide">
		<span class="caption">{text.line1}</span>
		<input
			autocomplete="address-line1"
			required
			value={value.line1}
			oninput={(e) => (draft.line1 = e.currentTarget.value)}
		/>
	</label>
	<label class="field wide">
		<span class="caption">{text.line2}</span>
		<input
			autocomplete="address-line2"
			value={value.line2}
			oninput={(e) => (draft.line2 = e.currentTarget.value)}
		/>
	</label>
	<label class="field wide">
		<span class="caption">{text.landmark}</span>
		<input value={value.landmark} oninput={(e) => (draft.landmark = e.currentTarget.value)} />
	</label>
	<label class="field">
		<span class="caption">{text.pincode}</span>
		<input
			inputmode="numeric"
			autocomplete="postal-code"
			maxlength="6"
			required
			value={value.pincode}
			oninput={(e) => (draft.pincode = e.currentTarget.value)}
		/>
	</label>
	<label class="field">
		<span class="caption">{text.city}</span>
		<input
			autocomplete="address-level2"
			required
			value={value.city}
			oninput={(e) => (draft.city = e.currentTarget.value)}
		/>
	</label>
	<label class="field wide">
		<span class="caption">{text.state}</span>
		<input
			autocomplete="address-level1"
			required
			value={value.state}
			oninput={(e) => (draft.state = e.currentTarget.value)}
		/>
	</label>
	{#if !first}
		<label class="check wide">
			<input
				type="checkbox"
				checked={value.makeDefault}
				onchange={(e) => (draft.makeDefault = e.currentTarget.checked)}
			/>
			{text.makeDefault}
		</label>
	{/if}
	{#if error}<div class="wide"><Notice tone="bad" role="alert">{error}</Notice></div>{/if}
	<div class="actions wide">
		<Button type="submit" variant="primary" disabled={saving}>
			{saving ? text.saving : text.saveAddress}
		</Button>
		{#if oncancel}<Button onclick={oncancel}>{text.cancel}</Button>{/if}
	</div>
</form>

<style lang="postcss">
	@reference 'src/app.css';

	form.form {
		@apply grid gap-4 sm:grid-cols-2;

		.wide {
			@apply sm:col-span-2;
		}
		label.field {
			@apply field-label;

			span.caption {
				@apply field-caption;
			}
			input {
				@apply control min-h-11 rounded-xl border-0;
			}
		}
		label.check {
			@apply flex min-h-11 items-center gap-3 text-sm font-bold;

			input {
				@apply size-5 rounded-md border-0 text-primary shadow-inset;
			}
		}
		div.actions {
			@apply flex flex-wrap gap-2;
		}
	}
</style>
