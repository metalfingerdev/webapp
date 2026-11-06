<script lang="ts">
	import { page } from '$app/state';

	const navLinks = [
		{ path: '/', label: 'Home' },
		{ path: '/dev', label: 'Dev' },
		{ path: '/test/ssr', label: 'SSR Test' },
		{ path: '/test/client-only', label: 'Client Test' },
		{ path: '/test/queries', label: 'Queries Test' }
	];
</script>

<header class="">
	<nav class="">
		<div class="">
			<a href="/" class=""> convex-better-auth-svelte </a>
			<ul class="">
				{#each navLinks as link}
					<li>
						<a href={link.path} class={page.url.pathname === link.path ? 'active' : ''}>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</nav>
</header>
