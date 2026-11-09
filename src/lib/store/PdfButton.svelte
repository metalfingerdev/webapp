<script lang="ts">
	import type { Snippet } from 'svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';

	// A button that makes a PDF: `make` fetches the data and draws the document. The label never
	// changes width while it works (a spinner takes its place), so nothing shifts under a thumb.
	let {
		make,
		children,
		variant = 'plain',
		large = false
	}: {
		make: () => Promise<void>;
		children: Snippet;
		variant?: 'plain' | 'primary';
		large?: boolean;
	} = $props();

	let busy = $state(false);
	let failed = $state(false);

	const run = async () => {
		busy = true;
		failed = false;
		try {
			await make();
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	};
</script>

<span class="pdf">
	<Button {variant} {large} disabled={busy} aria-busy={busy} onclick={run}>
		<span class="stack">
			<span class="label" class:hidden={busy}>{@render children()}</span>
			{#if busy}
				<span class="wait" role="status" aria-label={strings.documents.preparing}><Spinner /></span>
			{/if}
		</span>
	</Button>
	{#if failed}<span class="failed" role="alert">{strings.documents.failed}</span>{/if}
</span>

<style lang="postcss">
	@reference 'src/app.css';

	span.pdf {
		@apply inline-flex flex-col items-start gap-1;

		span.stack {
			@apply inline-grid place-items-center;

			> span {
				@apply col-start-1 row-start-1;
			}
			span.hidden {
				@apply invisible;
			}
		}
		span.failed {
			@apply text-sm text-danger;
		}
	}
</style>
