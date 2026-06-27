<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { Modal, Field, Button } from '../ui/index.js';
	import {
		useDashboard,
		TRACKING_STATUSES,
		type TrackingStatus
	} from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	let open = $state(false);
	let orderId = $state<Id<'orders'> | null>(null);
	let submitting = $state(false);
	let form = $state({
		status: 'processing' as TrackingStatus,
		carrier: '',
		location: '',
		message: ''
	});

	export function openFor(id: Id<'orders'>) {
		orderId = id;
		form = { status: 'processing', carrier: '', location: '', message: '' };
		open = true;
	}

	async function submit() {
		if (!orderId) return;
		submitting = true;
		try {
			await dash.pushTrackingEvent({
				orderId,
				status: form.status,
				carrier: form.carrier || undefined,
				location: form.location || undefined,
				message: form.message || undefined
			});
			open = false;
		} finally {
			submitting = false;
		}
	}
</script>

<Modal bind:open title="Push tracking event">
	<Field label="Status">
		<select bind:value={form.status}>
			{#each TRACKING_STATUSES as s (s)}<option value={s}>{s.replaceAll('_', ' ')}</option>{/each}
		</select>
	</Field>
	<Field label="Carrier"><input bind:value={form.carrier} placeholder="e.g. Delhivery" /></Field>
	<Field label="Location"><input bind:value={form.location} placeholder="e.g. Mumbai hub" /></Field>
	<Field label="Message"><input bind:value={form.message} placeholder="e.g. Out for delivery" /></Field>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		<Button onclick={submit} disabled={submitting}>{submitting ? 'Pushing…' : 'Push event'}</Button>
	{/snippet}
</Modal>
