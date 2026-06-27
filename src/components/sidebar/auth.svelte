<script lang="ts">
	import { useSidebar } from '$lib/sidebar/index.js';
	import { authClient } from '$lib/authentication/auth-client.js';
	import {
		signInWithEmail,
		signUpWithEmail,
		verifyOtpAndSignIn,
		signOut,
		signInWithGoogle
	} from '$lib/authentication/auth-flow.js';
	import { api } from '$convex/_generated/api.js';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { useAuth } from '$lib/svelte/index.js';

	let { data } = $props();

	const sidebar = useSidebar();
	const auth = useAuth();
	const convex = useConvexClient();
	const uid = $props.id();

	const currentUser = useQuery(
		api.auth.getCurrentUser,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({ initialData: data.currentUser, keepPreviousData: true })
	);

	// ── Form state ─────────────────────────────────────────────────────────────
	let isSignIn = $state(true);
	let step = $state<'credentials' | 'otp'>('credentials');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let otp = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	const onError = (msg: string) => {
		error = msg;
	};

	// auth.svelte
	function afterAuth() {
		sidebar.resolveAuth();
	}

	// Toggle between Sign In and Sign Up. Keeps the typed name/email so switching
	// modes doesn't wipe what the user already entered; clears transient fields.
	function toggleMode() {
		isSignIn = !isSignIn;
		step = 'credentials';
		password = '';
		otp = '';
		error = null;
	}

	// Partial reset — back from OTP to the sign-up form, keeps email/password
	function resetToSignUp() {
		step = 'credentials';
		otp = '';
		error = null;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = null;
		loading = true;
		try {
			if (isSignIn) {
				await signInWithEmail(authClient, { email, password, onSuccess: afterAuth, onError });
			} else {
				// Industry-standard: don't let signup silently land on an existing
				// account. If the email is already registered, route the user to
				// their real method instead of creating/verifying anything. The
				// check is best-effort — if it fails we fall through to signup,
				// which the server already handles safely.
				let existing: { exists: boolean; hasGoogle: boolean; hasPassword: boolean } | null = null;
				try {
					existing = await convex.query(api.auth.accountForEmail, { email });
				} catch {
					existing = null;
				}
				if (existing?.exists) {
					onError(
						existing.hasGoogle && !existing.hasPassword
							? 'You already have an account with Google. Use “Continue with Google” to sign in.'
							: 'An account with this email already exists. Switch to “Have an account? Sign in”.'
					);
					return;
				}

				await signUpWithEmail(authClient, {
					name,
					email,
					password,
					onSuccess: afterAuth,
					onError,
					onStepChange: (s) => {
						step = s;
					}
				});
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong.';
		} finally {
			loading = false;
		}
	}

	async function handleVerifyOtp(event: Event) {
		event.preventDefault();
		error = null;
		loading = true;
		try {
			await verifyOtpAndSignIn(authClient, { email, otp, password, onSuccess: afterAuth, onError });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong.';
		} finally {
			loading = false;
		}
	}

	async function handleSignOut() {
		await signOut(authClient, onError);
	}

	async function handleGoogleSignIn() {
		if (loading) return;
		error = null;
		loading = true;
		try {
			await signInWithGoogle(authClient, onError);
		} finally {
			loading = false;
		}
	}
</script>

<!-- The dialog header (back/close) is owned by the host; this panel owns the
     title + form. Styling lives in the modern-CSS block below. -->
<section class="auth">
	{#if auth.isAuthenticated}
		<header class="head">
			<h2>Account</h2>
			<p class="muted">Signed in as {currentUser.data?.name ?? currentUser.data?.email}</p>
		</header>
		<button class="btn outline" onclick={handleSignOut}>Sign out</button>
	{:else if step === 'otp'}
		<header class="head">
			<h2>Verify email</h2>
			<p class="muted">Enter the 6-digit code sent to {email}</p>
		</header>
		<form class="fields" onsubmit={handleVerifyOtp}>
			<div class="field">
				<label for="otp-{uid}">Code</label>
				<input
					id="otp-{uid}"
					class="input"
					type="text"
					inputmode="numeric"
					autocomplete="one-time-code"
					placeholder="123456"
					bind:value={otp}
					required
				/>
			</div>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<button class="btn primary" type="submit" disabled={loading}>
				{loading ? 'Verifying…' : 'Verify'}
			</button>
			<button class="btn ghost" type="button" onclick={resetToSignUp}>Back</button>
		</form>
	{:else}
		<header class="head">
			<h2>{isSignIn ? 'Login' : 'Create account'}</h2>
			<p class="muted">
				{isSignIn
					? 'Enter your email below to login to your account'
					: 'Enter your details below to get started'}
			</p>
		</header>
		<form class="fields" onsubmit={handleSubmit}>
			{#if !isSignIn}
				<div class="field">
					<label for="name-{uid}">Name</label>
					<input
						id="name-{uid}"
						class="input"
						type="text"
						placeholder="Your name"
						bind:value={name}
						required
					/>
				</div>
			{/if}
			<div class="field">
				<label for="email-{uid}">Email</label>
				<input
					id="email-{uid}"
					class="input"
					type="email"
					placeholder="m@example.com"
					autocomplete="email"
					bind:value={email}
					required
				/>
			</div>
			<div class="field">
				<label for="password-{uid}">Password</label>
				<input
					id="password-{uid}"
					class="input"
					type="password"
					autocomplete={isSignIn ? 'current-password' : 'new-password'}
					bind:value={password}
					required
				/>
			</div>

			{#if error}<p class="error" role="alert">{error}</p>{/if}

			<button class="btn primary" type="submit" disabled={loading}>
				{#if loading}
					{isSignIn ? 'Signing in…' : 'Creating account…'}
				{:else}
					{isSignIn ? 'Login' : 'Create account'}
				{/if}
			</button>

			<button class="btn outline" type="button" disabled={loading} onclick={handleGoogleSignIn}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
						fill="currentColor"
					/>
				</svg>
				Continue with Google
			</button>

			<p class="muted foot">
				{isSignIn ? "Don't have an account?" : 'Already have an account?'}
				<button type="button" class="link" onclick={toggleMode}>
					{isSignIn ? 'Sign up' : 'Sign in'}
				</button>
			</p>
		</form>
	{/if}
</section>

<style lang="postcss">
	@reference "src/app.css";
	/* Local design tokens — app.css ships no theme, so define a small neutral
	   palette here in oklch and derive states with color-mix(). */
	.auth {
		--radius: 0.65rem;
		--bg: oklch(1 0 0);
		--fg: oklch(0.21 0 0);
		--muted-fg: oklch(0.55 0 0);
		--border: oklch(0.92 0 0);
		--primary: oklch(0.21 0 0);
		--primary-fg: oklch(0.98 0 0);
		--ring: oklch(0.71 0 0);
		--destructive: oklch(0.58 0.22 27);

		@apply flex h-full flex-col gap-6 px-8 pt-32 pb-8 text-(--fg);
	}

	.head {
		@apply grid gap-1.5;

		h2 {
			@apply text-2xl leading-[1.15] font-semibold tracking-[-0.015em];
		}
	}

	.muted {
		@apply m-0 text-sm leading-[1.4] text-(--muted-fg);
	}

	.fields {
		@apply grid gap-4;
	}

	.field {
		@apply grid gap-2;

		label {
			@apply text-sm font-medium;
		}
	}

	.input {
		@apply w-full rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition-[border-color,box-shadow] duration-120 ease-[ease];

		&::placeholder {
			@apply text-[color-mix(in_oklab,var(--muted-fg)_65%,transparent)];
		}

		&:focus-visible {
			@apply border-(--ring) shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_30%,transparent)] outline-none;
		}
	}

	.btn {
		@apply inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius) border border-transparent px-4 py-2 text-sm font-medium transition-[background-color,border-color,opacity] duration-120 ease-[ease];

		& svg {
			@apply size-4;
		}

		&:disabled {
			@apply cursor-not-allowed opacity-[0.55];
		}

		&.primary {
			@apply bg-(--primary) text-(--primary-fg);

			&:not(:disabled):hover {
				@apply bg-[color-mix(in_oklab,var(--primary)_88%,white)];
			}
		}

		&.outline {
			@apply border-(--border) bg-(--bg) text-(--fg);

			&:not(:disabled):hover {
				@apply bg-[color-mix(in_oklab,var(--fg)_5%,var(--bg))];
			}
		}

		&.ghost {
			@apply bg-transparent text-(--muted-fg);

			&:not(:disabled):hover {
				@apply text-(--fg);
			}
		}
	}

	.foot {
		@apply text-center;
	}

	.link {
		font: inherit;
		@apply cursor-pointer border-none bg-none p-0 font-medium text-(--fg) underline underline-offset-2;

		&:hover {
			@apply text-[color-mix(in_oklab,var(--fg)_75%,var(--muted-fg))];
		}
	}

	.error {
		@apply m-0 text-sm text-(--destructive);
	}
</style>
