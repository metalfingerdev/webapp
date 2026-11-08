<script lang="ts">
	import AdminDashboard from '#lib/admin/ui/AdminDashboard.svelte';
	import { strings } from '#lib/store/strings.js';
</script>

<svelte:head>
	<title>{strings.admin.nav.users} · {strings.admin.title}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-extrabold">{strings.admin.nav.users}</h1>
<AdminDashboard />
