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

<!-- The dialog header (back/close/title) is owned by the host. This is just the
     step label for the form itself. -->
<h2 class="px-4 pt-4 font-medium">
	{isSignIn ? 'Sign In' : step === 'otp' ? 'Verify Email' : 'Sign Up'}
</h2>

{#if auth.isAuthenticated}
	<div>
		<p>{currentUser.data?.name ?? currentUser.data?.email}</p>
		<button onclick={handleSignOut}>Sign out</button>
	</div>
{:else if step === 'otp'}
	<form onsubmit={handleVerifyOtp}>
		<p>Enter the code sent to {email}</p>
		<input
			type="text"
			inputmode="numeric"
			autocomplete="one-time-code"
			placeholder="6-digit code"
			bind:value={otp}
			required
		/>
		{#if error}<p>{error}</p>{/if}
		<button type="submit" disabled={loading}>
			{loading ? 'Verifying...' : 'Verify'}
		</button>
		<button type="button" onclick={resetToSignUp}>Back</button>
	</form>
{:else}
	<form onsubmit={handleSubmit}>
		{#if !isSignIn}
			<input type="text" placeholder="Name" bind:value={name} required />
		{/if}
		<input type="email" placeholder="Email" bind:value={email} autocomplete="email" required />
		<input
			type="password"
			placeholder="Password"
			bind:value={password}
			autocomplete={isSignIn ? 'current-password' : 'new-password'}
			required
		/>
		{#if error}<p>{error}</p>{/if}
		<button type="submit" disabled={loading}>
			{#if loading}
				{isSignIn ? 'Signing in...' : 'Creating account...'}
			{:else}
				{isSignIn ? 'Sign in' : 'Create account'}
			{/if}
		</button>
		<button type="button" disabled={loading} onclick={handleGoogleSignIn}>
			Continue with Google
		</button>
		<button type="button" onclick={toggleMode}>
			{isSignIn ? 'No account? Sign up' : 'Have an account? Sign in'}
		</button>
	</form>
{/if}
