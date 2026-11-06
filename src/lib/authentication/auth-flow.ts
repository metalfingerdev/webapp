import { authClient } from '$lib/authentication/auth-client.js';

type Client = typeof authClient;

export interface SignInParams {
	email: string;
	password: string;
	onSuccess: () => void;
	onError: (message: string) => void;
}

export interface SignUpParams extends SignInParams {
	name: string;
	onStepChange: (step: 'otp') => void;
}

export interface VerifyOtpParams extends SignInParams {
	otp: string;
}

export async function signInWithEmail(client: Client, params: SignInParams) {
	await client.signIn.email(
		{ email: params.email, password: params.password },
		{
			onSuccess: params.onSuccess,
			onError: (ctx) => params.onError(ctx.error.message ?? 'Sign in failed.')
		}
	);
}

export async function signUpWithEmail(client: Client, params: SignUpParams) {
	const { error: signUpError } = await client.signUp.email({
		name: params.name,
		email: params.email,
		password: params.password
	});
	if (signUpError) {
		params.onError(signUpError.message ?? 'Sign up failed.');
		return;
	}

	const { error: otpError } = await client.emailOtp.sendVerificationOtp({
		email: params.email,
		type: 'email-verification'
	});
	if (otpError) {
		params.onError(otpError.message ?? 'Failed to send code.');
		return;
	}

	params.onStepChange('otp');
}

export async function verifyOtpAndSignIn(client: Client, params: VerifyOtpParams) {
	const { error } = await client.emailOtp.verifyEmail({
		email: params.email,
		otp: params.otp
	});
	if (error) {
		params.onError(error.message ?? 'Verification failed.');
		return;
	}

	// autoSignInAfterVerification (auth.ts) means the session is created by the
	// verify call itself — we're signed in, so just resolve.
	params.onSuccess();
}

export async function signOut(client: Client, onError: (message: string) => void) {
	const { error } = await client.signOut();
	if (error) onError(error.message ?? 'Sign out failed.');
}

export async function signInWithGoogle(client: Client, onError: (message: string) => void) {
	try {
		await client.signIn.social({ provider: 'google' });
	} catch (e) {
		onError(e instanceof Error ? e.message : 'Google sign in failed.');
	}
}
