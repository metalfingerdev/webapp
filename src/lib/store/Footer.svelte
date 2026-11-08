<script lang="ts">
	import { resolve } from '$app/paths';
	import { useDrawer } from './drawer.svelte.js';
	import { strings } from './strings.js';

	let { name, gstin }: { name: string; gstin?: string } = $props();
	// The account lives in the shop drawer
	const drawer = useDrawer();
</script>

<footer class="footer">
	<div class="inner">
		<p class="masthead">{strings.brand}</p>
		<section>
			<h2 class="heading">{strings.footer.account}</h2>
			<ul>
				<li>
					<button class="link" type="button" onclick={() => drawer.show('account')}>
						{strings.footer.myAccount}
					</button>
				</li>
			</ul>
		</section>
		<section>
			<h2 class="heading">{strings.footer.policies}</h2>
			<ul>
				{#each strings.policies.list as policy (policy.slug)}
					<li>
						<a href={resolve('/(shop)/policies/[slug]', { slug: policy.slug })}>{policy.title}</a>
					</li>
				{/each}
			</ul>
		</section>
	</div>
	<p class="legal">
		{#if gstin}{strings.footer.gstin}: {gstin} ·
		{/if}{strings.footer.rights(new Date().getFullYear(), name)}
	</p>
</footer>

<style lang="postcss">
	@reference 'src/app.css';

	/* The closing chapter of every page */
	footer.footer {
		@apply mx-3 mt-16 mb-3 chapter chapter-ink;

		div.inner {
			@apply mx-auto grid max-w-6xl gap-8 sm:grid-cols-[2fr_1fr_2fr];
		}
		p.masthead {
			@apply display text-4xl sm:text-5xl;
		}
		h2.heading {
			@apply mb-2 kicker;
		}
		:is(li a, button.link) {
			@apply flex min-h-11 items-center text-left font-semibold hover:text-accent;
		}
		p.legal {
			@apply mx-auto mt-10 max-w-6xl border-t border-border-muted pt-6 text-sm text-text-muted;
		}
	}
</style>
