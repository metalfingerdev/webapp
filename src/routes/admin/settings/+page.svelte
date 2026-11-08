<script lang="ts">
	import PaymentsPanel from '#lib/store/admin/PaymentsPanel.svelte';
	import ShopSettings from '#lib/store/admin/ShopSettings.svelte';
	import ZonesPanel from '#lib/store/admin/ZonesPanel.svelte';
	import { strings } from '#lib/store/strings.js';

	const text = strings.admin.settings;
</script>

<svelte:head>
	<title>{text.title} · {strings.admin.title}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-extrabold">{text.title}</h1>

<div class="flex max-w-3xl flex-col gap-8">
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

	h2 {
		@apply mb-3 text-lg font-extrabold;
	}
</style>
