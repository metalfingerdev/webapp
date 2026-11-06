<script lang="ts">
	let { title, href, content }: { title: string; href: string; content: string } = $props();
</script>

<li>
	<a {href} class="item">
		<div class="item-title">{title}</div>
		<p class="item-desc">{content}</p>
	</a>
</li>

<style lang="postcss">
	@reference 'src/app.css';

	.item {
		@apply block space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-neutral-100;
	}

	.item-title {
		@apply text-sm leading-none font-medium;
	}

	.item-desc {
		@apply line-clamp-2 text-sm leading-snug text-neutral-500;
	}
</style>
