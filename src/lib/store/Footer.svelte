<script lang="ts">
	import { resolve } from '$app/paths';
	import { strings } from './strings.js';

	let { name, gstin }: { name: string; gstin?: string } = $props();
</script>

<footer class="footer">
	<div class="inner">
		<section>
			<h2 class="heading">{strings.footer.account}</h2>
			<ul>
				<li><a href={resolve('/account')}>{strings.footer.myAccount}</a></li>
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

	.footer {
		@apply mt-12 bg-midground px-4 py-8;
	}
	.inner {
		@apply mx-auto grid max-w-6xl gap-6 sm:grid-cols-2;
	}
	.heading {
		@apply mb-1 text-xs font-extrabold tracking-wide text-text-muted uppercase;
	}
	li a {
		@apply flex min-h-11 items-center;
	}
	.legal {
		@apply mx-auto mt-6 max-w-6xl text-sm text-text-muted;
	}
</style>
