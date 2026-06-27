<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { Modal, Field, Button } from '../ui/index.js';
	import { useDashboard, type School } from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	let open = $state(false);
	let editingId = $state<Id<'schools'> | null>(null);
	let form = $state({ name: '', code: '' });
	let submitting = $state(false);
	let error = $state('');

	export function openCreate() {
		editingId = null;
		form = { name: '', code: '' };
		error = '';
		open = true;
	}

	export function openEdit(s: School) {
		editingId = s._id;
		form = { name: s.name, code: s.code ?? '' };
		error = '';
		open = true;
	}

	async function submit() {
		submitting = true;
		error = '';
		try {
			const payload = { name: form.name, code: form.code || undefined };
			if (editingId) await dash.updateSchool({ id: editingId, ...payload });
			else await dash.createSchool(payload);
			open = false;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Something went wrong.';
		} finally {
			submitting = false;
		}
	}
</script>

<Modal bind:open title={editingId ? 'Edit school' : 'New school'}>
	<Field label="Name"><input bind:value={form.name} placeholder="e.g. Delhi Public School" /></Field>
	<Field label="Code" hint="Optional short code"><input bind:value={form.code} placeholder="e.g. DPS-01" /></Field>
	{#if error}<p class="err">{error}</p>{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		<Button onclick={submit} disabled={submitting || !form.name}>
			{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
		</Button>
	{/snippet}
</Modal>

<style lang="postcss">
	@reference 'src/app.css';
	.err {
		@apply text-sm text-red-600;
	}
</style>
