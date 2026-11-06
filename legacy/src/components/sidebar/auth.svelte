<script lang="ts">
	import { useSidebar } from '#lib/sidebar/index.js';
	import SignIn from '#lib/auth/ui/SignIn.svelte';

	const sidebar = useSidebar();
</script>

<div class="auth">
	<SignIn onSignIn={() => sidebar.resolveAuth()} />
</div>

<style lang="postcss">
	@reference 'src/app.css';

	.auth {
		@apply p-4;
	}
</style>
