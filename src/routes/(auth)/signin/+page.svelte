<script lang="ts">
	import { resolve } from '$app/paths';
	import SignIn from '../../../lib/auth/ui/SignIn.svelte';
	import Media from '#lib/ui/Media.svelte';
	import { strings } from '#lib/store/strings.js';
</script>

<!-- The sign-in page: the brand in an ink chapter beside the form (stacked on phones) -->
<div class="signin-page">
	<aside class="brand">
		<a class="masthead" href={resolve('/(shop)')}>{strings.brand}</a>
		<p class="tagline">{strings.tagline}</p>
		<Media slot="signin" ratio="4 / 3" />
	</aside>
	<main class="form">
		<SignIn />
	</main>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.signin-page {
		@apply grid min-h-dvh gap-3 p-3 md:grid-cols-2;

		aside.brand {
			@apply flex flex-col justify-between gap-6 chapter chapter-ink max-md:hidden;

			a.masthead {
				@apply type-display text-5xl;
			}
			p.tagline {
				@apply max-w-sm text-lg text-text-muted;
			}
		}
		main.form {
			@apply flex flex-col justify-center;
		}
	}
</style>
