<script lang="ts">
	import { resolve } from '$app/paths';
	import { gotoApp } from '#lib/primitives/utils/navigation.js';

	// The order board takes this page in step 7c; until then the admin opens on Products.
	$effect(() => {
		void gotoApp(resolve('/admin/products'), { replace: true });
	});
</script>
