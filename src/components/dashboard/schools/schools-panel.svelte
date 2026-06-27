<script lang="ts">
	import type { Id } from '$convex/_generated/dataModel.js';
	import { Plus } from '@lucide/svelte';
	import { Card, Button } from '../ui/index.js';
	import SchoolModal from './school-modal.svelte';
	import BundlePanel from './bundle-panel.svelte';
	import { useDashboard } from '$lib/dashboard/dashboard.svelte.js';

	const dash = useDashboard();

	let deleteId = $state<Id<'schools'> | null>(null);
	let deleteError = $state('');
	let expandedId = $state<Id<'schools'> | null>(null);
	let modal = $state<ReturnType<typeof SchoolModal>>();

	async function confirmDelete() {
		if (!deleteId) return;
		deleteError = '';
		try {
			await dash.removeSchool({ id: deleteId });
			deleteId = null;
		} catch (e: unknown) {
			deleteError = e instanceof Error ? e.message : 'Could not delete.';
		}
	}
</script>

<header class="head">
	<h1>Schools</h1>
	<Button onclick={() => modal?.openCreate()}><Plus size={16} /> Add school</Button>
</header>

<Card>
	{#if dash.schools.isLoading}
		<p class="empty">Loading…</p>
	{:else if (dash.schools.data ?? []).length === 0}
		<p class="empty">No schools yet.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr><th>Name</th><th>Code</th><th></th></tr>
				</thead>
				<tbody>
					{#each dash.schools.data ?? [] as s (s._id)}
						<tr>
							<td class="name">{s.name}</td>
							<td class="muted">{s.code ?? '—'}</td>
							<td>
								{#if deleteId === s._id}
									<span class="confirm">
										{deleteError || 'Delete?'}
										<Button size="sm" variant="destructive" onclick={confirmDelete}>Yes</Button>
										<Button size="sm" variant="ghost" onclick={() => { deleteId = null; deleteError = ''; }}>No</Button>
									</span>
								{:else}
									<div class="actions">
										<Button size="sm" variant="outline" onclick={() => modal?.openEdit(s)}>Edit</Button>
										<Button size="sm" variant="ghost" onclick={() => { deleteId = s._id; deleteError = ''; }}>Delete</Button>
										<Button size="sm" variant="ghost" onclick={() => (expandedId = expandedId === s._id ? null : s._id)}>
											{expandedId === s._id ? 'Hide bundles' : 'Bundles'}
										</Button>
									</div>
								{/if}
							</td>
						</tr>
						{#if expandedId === s._id}
							<tr class="expanded">
								<td colspan="3"><BundlePanel schoolId={s._id} /></td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<SchoolModal bind:this={modal} />

<style lang="postcss">
	@reference 'src/app.css';

	.head {
		@apply mb-4 flex items-center justify-between;
		h1 {
			@apply text-xl font-semibold text-neutral-900;
		}
	}
	.empty {
		@apply p-6 text-sm text-neutral-500;
	}
	.table-wrap {
		@apply overflow-x-auto;
	}
	table {
		@apply w-full text-sm;
	}
	thead th {
		@apply border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-neutral-500 uppercase;
	}
	tbody td {
		@apply border-b border-neutral-100 px-4 py-3 align-middle;
	}
	.expanded td {
		@apply bg-neutral-50 p-3;
	}
	.name {
		@apply font-medium text-neutral-900;
	}
	.muted {
		@apply text-neutral-500;
	}
	.actions {
		@apply flex items-center gap-2;
	}
	.confirm {
		@apply inline-flex items-center gap-2 text-sm text-neutral-600;
	}
</style>
