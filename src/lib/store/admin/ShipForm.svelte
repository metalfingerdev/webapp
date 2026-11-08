<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api.js';
	import { COURIERS } from '#convex/model/store/couriers.js';
	import { errorText } from '#lib/store/format.js';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Notice from '#lib/ui/Notice.svelte';

	// Hand a packed order to the courier (courier and AWB) or send it out locally (nothing needed).
	let { number, local }: { number: string; local: boolean } = $props();
	const text = strings.admin.ship;
	const client = useConvexClient();

	let courier = $state<string>(COURIERS[0]);
	let other = $state('');
	let awb = $state('');
	let trackingUrl = $state('');
	let error = $state('');
	let busy = $state(false);

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		busy = true;
		error = '';
		try {
			await client.mutation(
				api.store.admin.orders.markShipped,
				local
					? { number }
					: {
							number,
							courier: courier === 'Other' ? other : courier,
							awb,
							trackingUrl: trackingUrl || undefined
						}
			);
		} catch (e) {
			error = errorText(e, strings.admin.failed);
		} finally {
			busy = false;
		}
	};
</script>

<form class="ship" onsubmit={submit}>
	{#if local}
		<p class="text-text-muted text-sm">{text.localHint}</p>
	{:else}
		<div class="grid">
			<Field label={text.courier}>
				<select bind:value={courier}>
					{#each COURIERS as c (c)}<option value={c}>{c}</option>{/each}
				</select>
			</Field>
			{#if courier === 'Other'}
				<Field label={text.otherCourier}><input bind:value={other} required maxlength="40" /></Field
				>
			{/if}
			<Field label={text.awb}>
				<input bind:value={awb} required autocapitalize="characters" autocomplete="off" />
			</Field>
			<div class="wide">
				<Field label={text.trackingUrl} hint={text.trackingHint}>
					<input bind:value={trackingUrl} type="url" inputmode="url" />
				</Field>
			</div>
		</div>
	{/if}
	{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
	<div>
		<Button type="submit" variant="primary" disabled={busy}>
			{local ? text.outForDelivery : text.submit}
		</Button>
	</div>
</form>

<style lang="postcss">
	@reference 'src/app.css';

	.ship {
		@apply flex flex-col gap-3;
	}
	.grid {
		@apply grid gap-3 sm:grid-cols-2;
	}
	.wide {
		@apply sm:col-span-2;
	}
</style>
