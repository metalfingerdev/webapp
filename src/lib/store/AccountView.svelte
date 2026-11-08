<script lang="ts">
	import { resolve } from '$app/paths';
	import { refreshAll } from '$app/navigation';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { Avatar } from 'bits-ui';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import UserIcon from '@lucide/svelte/icons/user';
	import { api } from '#convex/_generated/api.js';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { useIsAppAdmin } from '#lib/admin/api/admin.svelte.js';
	import { ADMIN_ROUTE } from '#lib/admin/utils/admin.constants.js';
	import { getAuthContext } from '#lib/auth/context.svelte.js';
	import SignIn from '#lib/auth/ui/SignIn.svelte';
	import Button from '#lib/ui/Button.svelte';
	import Pill from '#lib/ui/Pill.svelte';
	import AddressForm from './AddressForm.svelte';
	import { useDrawer } from './drawer.svelte.js';
	import { formatDate, formatPrice } from './format.js';
	import { strings } from './strings.js';

	// The account, as a view of the shop drawer: the idea of the old sidebar's user and sign-in views
	// (legacy/src/components/sidebar/{user,auth}.svelte), rebuilt on the new functions. Signed out, the
	// sign-in form itself; signed in, a greeting, recent orders, saved addresses, account settings and
	// sign out. Every Convex function behind it checks who is signed in; this view only shows.
	const auth = useAuth();
	const admin = useIsAppAdmin();
	const drawer = useDrawer();
	const client = useConvexClient();
	const { authClient } = getAuthContext();
	const text = strings.account;
	const RECENT_ORDERS = 3;

	const signedIn = $derived(auth.isAuthenticated);
	const user = useQuery(api.users.queries.getActiveUser, () => (signedIn ? {} : 'skip'));
	const orders = useQuery(api.store.orders.myOrders, () => (signedIn ? {} : 'skip'));
	const addresses = useQuery(api.store.addresses.list, () => (signedIn ? {} : 'skip'));

	const me = $derived(user.data);
	// A phone-only sign-up has its number as its name and only a placeholder email
	const realName = $derived(me?.name && !/^\+?\d[\d\s]*$/.test(me.name) ? me.name : '');
	const firstName = $derived(realName.split(/\s+/)[0] ?? '');
	// Shown until the photo loads, or instead of it: two initials, or a person icon for no name
	const initials = $derived(
		realName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0]?.toUpperCase())
			.join('')
	);
	const contact = $derived(
		me?.phoneNumber ?? (me?.email && !me.email.endsWith('.invalid') ? me.email : '')
	);
	const tone = (status: string) =>
		status === 'cancelled' ? 'bad' : status === 'delivered' ? 'ok' : 'warn';

	// One address form at a time: a new one, or the address being edited
	let editing = $state<Id<'addresses'> | 'new' | null>(null);
	const removeAddress = (id: Id<'addresses'>) =>
		client.mutation(api.store.addresses.remove, { id });

	let signingOut = $state(false);
	const signOut = async () => {
		signingOut = true;
		try {
			const result = await authClient.signOut();
			if (result.data?.success) {
				drawer.show('root');
				await refreshAll();
			}
		} finally {
			signingOut = false;
		}
	};
</script>

<div class="account-view">
	{#if auth.isLoading}
		<h2 class="hello"><span class="bone">{text.hello('')}</span></h2>
	{:else if !signedIn}
		<h2 class="hello">{text.signInTitle}</h2>
		<p class="note">{strings.menu.signInHint}</p>
		<!-- Off the /signin page it stays here once signed in, and this view turns into the account -->
		<SignIn />
	{:else}
		<!-- Same height loading or loaded, so nothing below moves -->
		<header class="who" aria-busy={me === undefined}>
			{#if me === undefined}
				<span class="photo bone" aria-hidden="true"></span>
			{:else}
				<Avatar.Root class="account-photo">
					{#if me?.image}<Avatar.Image src={me.image} alt="" class="account-photo-img" />{/if}
					<Avatar.Fallback class="account-photo-fallback">
						{#if initials}{initials}{:else}<UserIcon size={28} aria-hidden="true" />{/if}
					</Avatar.Fallback>
				</Avatar.Root>
			{/if}
			<div class="names">
				<h2 class="hello">
					{#if me === undefined}<span class="bone">{text.hello('')}</span>{:else}{text.hello(
							firstName
						)}{/if}
				</h2>
				<p class="note">
					{#if me === undefined}<span class="bone">+91 00000 00000</span>{:else}{contact}{/if}
				</p>
			</div>
		</header>

		<section class="group">
			<div class="group-head">
				<h3>{text.recentOrders}</h3>
				<a class="more" href={resolve('/(shop)/orders')}>{text.allOrders}</a>
			</div>
			{#if orders.data === undefined}
				<span class="order bone" aria-hidden="true"></span>
			{:else if orders.data.length === 0}
				<p class="note">{strings.orders.empty}</p>
			{:else}
				<ul class="list">
					{#each orders.data.slice(0, RECENT_ORDERS) as order (order.number)}
						<li>
							<a class="order" href={resolve('/(shop)/orders/[number]', { number: order.number })}>
								<span class="top">
									<strong>{order.number}</strong>
									<Pill tone={tone(order.status)}>{strings.orders.status[order.status]}</Pill>
								</span>
								<span class="note">
									{formatDate(order.placedAt)} · {formatPrice(order.total)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="group">
			<div class="group-head">
				<h3>{text.addresses}</h3>
				{#if editing === null && (addresses.data?.length ?? 0) < 10}
					<button class="more" type="button" onclick={() => (editing = 'new')}>
						{strings.checkout.addAddress}
					</button>
				{/if}
			</div>
			{#if editing === 'new'}
				<AddressForm
					first={addresses.data?.length === 0}
					onsaved={() => (editing = null)}
					oncancel={() => (editing = null)}
				/>
			{/if}
			{#if addresses.data === undefined}
				<span class="address bone" aria-hidden="true"></span>
			{:else if addresses.data.length === 0 && editing !== 'new'}
				<p class="note">{text.noAddresses}</p>
			{:else}
				<ul class="list">
					{#each addresses.data as address (address.id)}
						<li>
							{#if editing === address.id}
								<AddressForm
									existing={address}
									onsaved={() => (editing = null)}
									oncancel={() => (editing = null)}
								/>
							{:else}
								<div class="address">
									<span class="top">
										<strong>{address.name}</strong>
										{#if address.isDefault}<Pill>{text.default}</Pill>{/if}
									</span>
									<span class="note">
										{address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city},
										{address.state}
										{address.pincode}
									</span>
									<span class="actions">
										<button type="button" onclick={() => (editing = address.id)}>
											{strings.checkout.edit}
										</button>
										<button class="danger" type="button" onclick={() => removeAddress(address.id)}>
											{strings.checkout.remove}
										</button>
									</span>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<ul class="rows">
			<li>
				<a href={resolve('/account/profile')}>
					<span class="row-text">
						{text.settings}
						<small>{text.settingsHint}</small>
					</span>
					<ChevronRightIcon size={24} aria-hidden="true" />
				</a>
			</li>
			{#if admin.isAppAdmin}
				<li>
					<a href={resolve(ADMIN_ROUTE)}>
						{strings.nav.dashboard}
						<ChevronRightIcon size={24} aria-hidden="true" />
					</a>
				</li>
			{/if}
		</ul>

		<Button disabled={signingOut} onclick={signOut}>
			<LogOutIcon size={20} aria-hidden="true" />
			{text.signOut}
		</Button>
	{/if}
</div>

<style lang="postcss">
	@reference 'src/app.css';

	/* Sits in the drawer's view, so it keeps the view's spacing */
	div.account-view {
		@apply flex flex-col gap-6;

		h2.hello {
			@apply type-headline text-3xl;
		}
		.note {
			@apply min-h-5 text-sm text-text-muted tabular-nums;
		}

		/* Photo beside the greeting; the placeholder is the same size, so loading never moves it */
		header.who {
			@apply flex items-center gap-4;

			span.photo {
				@apply size-16 shrink-0 rounded-full;
			}
			:global(div.account-photo) {
				@apply grid size-16 shrink-0 place-items-center overflow-hidden rounded-full raised font-display text-xl font-extrabold text-primary;
			}
			:global(img.account-photo-img) {
				@apply size-full object-cover;
			}
			:global(span.account-photo-fallback) {
				@apply grid size-full place-items-center;
			}
			div.names {
				@apply flex min-w-0 flex-1 flex-col gap-0.5;

				.note {
					@apply truncate;
				}
			}
		}

		section.group {
			@apply flex flex-col gap-3;

			div.group-head {
				@apply flex items-center justify-between gap-3;

				h3 {
					@apply type-kicker;
				}
			}
			:is(a, button).more {
				@apply inline-flex min-h-11 items-center text-sm font-bold text-accent;
			}
			ul.list {
				@apply flex flex-col gap-3;
			}
			:is(a.order, span.order, div.address, span.address) {
				@apply flex min-h-16 flex-col gap-1 rounded-2xl raised p-4;
			}
			a.order {
				@apply press;

				strong {
					@apply font-display;
				}
			}
			span.top {
				@apply flex items-center justify-between gap-2;
			}
			span.actions {
				@apply flex gap-4;

				button {
					@apply min-h-11 text-sm font-bold text-accent;

					&.danger {
						@apply text-danger;
					}
				}
			}
		}

		ul.rows {
			@apply flex flex-col;

			a {
				@apply flex min-h-16 w-full items-center justify-between gap-3 border-b border-border-muted type-headline text-xl;
			}
			span.row-text {
				@apply flex min-w-0 flex-col py-2;

				small {
					@apply truncate font-sans text-sm font-semibold tracking-normal text-text-muted;
				}
			}
		}
	}
</style>
