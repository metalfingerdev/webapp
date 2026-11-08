<script lang="ts">
	import PaymentsPanel from '#lib/store/admin/PaymentsPanel.svelte';
	import ShopSettings from '#lib/store/admin/ShopSettings.svelte';
	import ZonesPanel from '#lib/store/admin/ZonesPanel.svelte';
	import PageHead from '#lib/store/PageHead.svelte';
	import { strings } from '#lib/store/strings.js';

	const text = strings.admin.settings;
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<PageHead title={text.title} size="headline" />

<div class="sections">
	<section>
		<h2>{text.shop}</h2>
		<ShopSettings />
	</section>
	<section>
		<h2>{text.zones}</h2>
		<ZonesPanel />
	</section>
	<section>
		<h2>{text.payments}</h2>
		<PaymentsPanel />
	</section>
</div>

<style lang="postcss">
	@reference 'src/app.css';

	div.sections {
		@apply flex max-w-3xl flex-col gap-10;

		h2 {
			@apply mb-4 type-headline text-3xl;
		}
	}
</style>
