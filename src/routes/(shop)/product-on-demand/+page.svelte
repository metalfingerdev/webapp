<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { api } from '#convex/_generated/api.js';
	import { CLASS_OPTIONS } from '#convex/model/store/classes.js';
	import { ENQUIRY_PROMISE } from '#convex/model/store/storeProfile.js';
	import { errorText } from '#lib/store/format.js';
	import { accountEmail, accountName, accountPhone } from '#lib/store/me.js';
	import PageHead from '#lib/store/PageHead.svelte';
	import SeoHead from '#lib/store/SeoHead.svelte';
	import { strings } from '#lib/store/strings.js';
	import Button from '#lib/ui/Button.svelte';
	import Field from '#lib/ui/Field.svelte';
	import Notice from '#lib/ui/Notice.svelte';

	// Product On Demand: a public form. The server checks every field again and limits how often one
	// phone number can send.
	const text = strings.enquiry;
	const client = useConvexClient();

	let name = $state('');
	let phone = $state('');
	let email = $state('');
	let bookName = $state('');
	let author = $state('');
	let classLevel = $state('');
	let error = $state('');
	let busy = $state(false);
	let number = $state('');

	// A signed-in parent's details, filled once into the fields still empty. Guests see no change.
	const auth = useAuth();
	const user = useQuery(api.users.queries.getActiveUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	let prefilled = false;
	$effect(() => {
		const me = user.data;
		if (!me || prefilled) return;
		prefilled = true;
		name ||= accountName(me);
		phone ||= accountPhone(me);
		email ||= accountEmail(me);
	});

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		busy = true;
		error = '';
		try {
			const result = await client.mutation(api.store.enquiries.submit, {
				name,
				phone,
				email,
				bookName,
				author: author || undefined,
				classLevel: classLevel || undefined
			});
			number = result.number;
		} catch (e) {
			error = errorText(e, text.failed);
		} finally {
			busy = false;
		}
	};

	const again = () => {
		bookName = '';
		author = '';
		classLevel = '';
		number = '';
	};
</script>

<SeoHead title={text.title} description={text.lead} />

<PageHead title={text.title} kicker={text.kicker} lead={text.lead} />

<section class="enquiry">
	{#if number}
		<div class="done" role="status">
			<h2 class="title">{text.doneTitle}</h2>
			<p class="number">{text.number}: <strong>{number}</strong></p>
			<p>{ENQUIRY_PROMISE}</p>
			<div><Button onclick={again}>{text.another}</Button></div>
		</div>
	{:else}
		<form onsubmit={submit}>
			<Field label={text.bookName}>
				<input bind:value={bookName} required maxlength="150" autocomplete="off" />
			</Field>
			<Field label={text.author}>
				<input bind:value={author} maxlength="100" autocomplete="off" />
			</Field>
			<Field label={text.classLevel}>
				<select bind:value={classLevel}>
					<option value="">{text.anyClass}</option>
					{#each CLASS_OPTIONS as label (label)}<option value={label}>{label}</option>{/each}
				</select>
			</Field>
			<Field label={text.name}>
				<input bind:value={name} required maxlength="80" autocomplete="name" />
			</Field>
			<Field label={text.phone} hint={text.phoneHint}>
				<input bind:value={phone} required type="tel" inputmode="tel" autocomplete="tel" />
			</Field>
			<Field label={text.email}>
				<input bind:value={email} required type="email" maxlength="120" autocomplete="email" />
			</Field>
			<div class="actions">
				{#if error}<Notice tone="bad" role="alert">{error}</Notice>{/if}
				<Button type="submit" variant="primary" disabled={busy}>{text.send}</Button>
			</div>
		</form>
	{/if}
</section>

<style lang="postcss">
	@reference 'src/app.css';

	section.enquiry {
		@apply mx-auto max-w-2xl;

		form {
			@apply grid gap-4 rounded-[1.75rem] raised p-5 sm:grid-cols-2;

			div.actions {
				@apply flex flex-col items-start gap-3 sm:col-span-2;
			}
		}
		div.done {
			@apply flex flex-col items-start gap-3 rounded-[1.75rem] raised p-6;

			h2.title {
				@apply type-title;
			}
			p.number strong {
				@apply font-mono text-lg tracking-wider;
			}
		}
	}
</style>
