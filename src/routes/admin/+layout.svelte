<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '#lib/ui/Button.svelte';
	import Spinner from '#lib/ui/Spinner.svelte';
	import { resolve } from '$app/paths';
	import { gotoApp } from '#lib/primitives/utils/navigation.js';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import { useQuery } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '#lib/auth/context.svelte.js';
	import AdminShell from '#lib/store/admin/AdminShell.svelte';
	import { strings } from '#lib/store/strings.js';
	import { ADMIN_ROUTE } from '#lib/admin/utils/admin.constants.js';

	let { children }: { children: Snippet } = $props();

	const text = strings.admin;
	const { api } = getAuthContext();
	const auth = useAuth();

	// `undefined` while loading, `true`/`false` once resolved.
	const adminResponse = useQuery(api.admin.queries.isCurrentUserAdmin, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const isAdmin = $derived(adminResponse?.data);

	// Gating is UX only: the real boundary is `requireAppAdmin` in every admin Convex function.
	// Signed-out visitors go to sign-in and come back to /admin.
	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			void gotoApp(
				`${resolve('/(auth)/signin')}?redirectTo=${encodeURIComponent(resolve(ADMIN_ROUTE))}`,
				{ replace: true }
			);
		}
	});
</script>

<svelte:head>
	<title>{text.title}</title>
</svelte:head>

{#if adminResponse.error}
	<div class="failed">
		{adminResponse.error.message}
	</div>
{:else if auth.isLoading || !auth.isAuthenticated || isAdmin === undefined}
	<div class="waiting">
		<Spinner />
	</div>
{:else if isAdmin === false}
	<div class="denied">
		<ShieldAlertIcon size={40} aria-hidden="true" />
		<div>
			<h1>{text.denied.title}</h1>
			<p>{text.denied.body}</p>
		</div>
		<Button href={resolve('/(shop)')}>{text.denied.home}</Button>
	</div>
{:else}
	<AdminShell>{@render children()}</AdminShell>
{/if}

<style lang="postcss">
	@reference 'src/app.css';

	div.failed {
		@apply mx-auto max-w-md p-6 text-center text-sm text-danger;
	}
	div.waiting {
		@apply flex min-h-[60vh] items-center justify-center p-6;
	}
	div.denied {
		@apply mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center;

		> :global(svg) {
			@apply opacity-60;
		}
		h1 {
			@apply type-headline;
		}
		p {
			@apply mt-1 text-sm text-text-muted;
		}
	}
</style>
