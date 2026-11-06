<script lang="ts">
	import { resolve } from '$app/paths';
	import UserButton from '#lib/users/ui/UserButton.svelte';
	import { strings } from './strings.js';

	// The account menu holds sign-in, the account page and, for admins, the admin link
	let { initialData }: { initialData?: Parameters<typeof UserButton>[1]['initialData'] } = $props();
</script>

<header class="shop-header">
	<a class="brand" href={resolve('/')}>{strings.brand}</a>
	<UserButton {initialData} />
</header>

<style lang="postcss">
	@reference 'src/app.css';

	.shop-header {
		@apply flex items-center justify-between gap-4 border-b border-border bg-foreground px-4 py-3;
	}
	.brand {
		@apply text-lg font-bold text-primary;
	}
</style>
