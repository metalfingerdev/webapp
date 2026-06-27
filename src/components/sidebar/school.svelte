<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '$convex/_generated/api.js';
	import { useSidebar } from '$lib/sidebar/index.js';

	const sidebar = useSidebar();

	// Schools that have bundles, each with its grades. Each grade links to that
	// school's grade-wise set (/shop/<school>/<grade>).
	const catalog = useQuery(api.bundle.listBundleCatalog, {});

	const close = () => sidebar.close();
</script>

<section class="cat">
	<h2 class="title">Schools</h2>

	<a class="hero" href="/schools" onclick={close}>
		<span class="hero-heading">Find your school's set</span>
		<span class="hero-cta">Shop by school</span>
		<span class="hero-go"><ArrowRight size={18} /></span>
	</a>

	{#if catalog.isLoading}
		<p class="status">Loading…</p>
	{:else if (catalog.data ?? []).length === 0}
		<p class="status">No school bundles yet.</p>
	{:else}
		{#each catalog.data ?? [] as s (s.schoolSlug)}
			<div class="group">
				<span class="label">{s.schoolName}</span>
				{#each s.grades as g (g.gradeSlug)}
					<a class="row" href="/shop/{s.schoolSlug}/{g.gradeSlug}" onclick={close}>
						{g.grade}
						<ArrowRight size={18} />
					</a>
				{/each}
			</div>
		{/each}
	{/if}
</section>

<style lang="postcss">
	@reference 'src/app.css';

	.cat {
		@apply m-4 grid gap-6;
	}

	.title {
		@apply text-2xl font-semibold tracking-[-0.015em];
	}

	.hero {
		@apply relative grid gap-1 squircle-4xl bg-gradient-to-br from-neutral-800 to-neutral-600 p-4 pb-14 text-white;

		.hero-heading {
			@apply max-w-[14rem] text-lg leading-tight font-semibold;
		}
		.hero-cta {
			@apply text-sm text-white/80;
		}
		.hero-go {
			@apply absolute bottom-4 left-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-900;
		}
	}

	.status {
		@apply px-2 py-2 text-sm text-neutral-500;
	}

	.group {
		@apply grid gap-1;
	}

	.label {
		@apply px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase;
	}

	.row {
		@apply flex items-center justify-between squircle-4xl px-2 py-3 text-lg text-neutral-900 transition-colors;

		&:hover {
			@apply bg-neutral-100;
		}
	}
</style>
