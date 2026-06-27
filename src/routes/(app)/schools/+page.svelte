<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const catalog = $derived(data.catalog.data ?? []);
</script>

<svelte:head>
	<title>Shop by school — Aggarwal Book &amp; Stationery Mart</title>
	<meta name="description" content="Find your school's grade-wise book and uniform bundles." />
</svelte:head>

<main class="schools">
	<header class="head">
		<h1>Shop by school</h1>
		<p class="sub">Pick your school and grade to get the full set in one go.</p>
	</header>

	{#if catalog.length === 0}
		<p class="empty">No school bundles available yet.</p>
	{:else}
		<div class="grid">
			{#each catalog as school (school.schoolSlug)}
				<section class="school">
					<h2>{school.schoolName}</h2>
					<ul class="grades">
						{#each school.grades as g (g.gradeSlug)}
							<li>
								<a class="grade" href="/shop/{school.schoolSlug}/{g.gradeSlug}">{g.grade}</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</main>

<style lang="postcss">
	@reference 'src/app.css';

	.schools {
		@apply mx-auto grid max-w-4xl gap-8 p-6 pt-24;
	}
	.head {
		@apply grid gap-1;

		h1 {
			@apply text-2xl font-semibold text-neutral-900;
		}
		.sub {
			@apply text-sm text-neutral-500;
		}
	}
	.empty {
		@apply text-sm text-neutral-500;
	}
	.grid {
		@apply grid gap-6 sm:grid-cols-2;
	}
	.school {
		@apply grid gap-3 rounded-xl border border-neutral-200 p-5;

		h2 {
			@apply text-base font-semibold text-neutral-900;
		}
	}
	.grades {
		@apply flex flex-wrap gap-2;
	}
	.grade {
		@apply inline-flex cursor-pointer items-center rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white;
	}
</style>
