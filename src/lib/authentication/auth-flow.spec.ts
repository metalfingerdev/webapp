import { describe, it, expect, vi } from 'vitest';

// auth-flow imports `authClient` only for its *type*; the functions operate on
// the `client` passed in. Stub the module so importing the flow under test
// doesn't spin up the real better-auth client (no network, no window deps).
vi.mock('$lib/authentication/auth-client.js', () => ({ authClient: {} }));

import {
	signInWithEmail,
	signUpWithEmail,
	verifyOtpAndSignIn,
	signOut,
	signInWithGoogle
} from './auth-flow.js';

// The real client type is huge; we only ever exercise a few methods. Build a
// partial mock per test and cast it in at the call site.
type FlowClient = Parameters<typeof signInWithEmail>[0];
const asClient = (c: unknown) => c as FlowClient;

// signIn.email takes (credentials, { onSuccess, onError }) callbacks.
type EmailCallbacks = {
	onSuccess: () => void;
	onError: (ctx: { error: { message?: string } }) => void;
};

// ---------------------------------------------------------------------------
// signInWithEmail
// ---------------------------------------------------------------------------

describe('signInWithEmail', () => {
	it('passes credentials through and calls onSuccess on success', async () => {
		const email = vi.fn((_creds: unknown, cbs: EmailCallbacks) => cbs.onSuccess());
		const onSuccess = vi.fn();
		const onError = vi.fn();

		await signInWithEmail(asClient({ signIn: { email } }), {
			email: 'dev@example.com',
			password: 'pw',
			onSuccess,
			onError
		});

		expect(email).toHaveBeenCalledWith(
			{ email: 'dev@example.com', password: 'pw' },
			expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
		);
		expect(onSuccess).toHaveBeenCalledOnce();
		expect(onError).not.toHaveBeenCalled();
	});

	it('surfaces the error message on failure', async () => {
		const email = vi.fn((_creds: unknown, cbs: EmailCallbacks) =>
			cbs.onError({ error: { message: 'bad creds' } })
		);
		const onError = vi.fn();

		await signInWithEmail(asClient({ signIn: { email } }), {
			email: 'dev@example.com',
			password: 'pw',
			onSuccess: vi.fn(),
			onError
		});

		expect(onError).toHaveBeenCalledWith('bad creds');
	});

	it('falls back to a default message when the error has none', async () => {
		const email = vi.fn((_creds: unknown, cbs: EmailCallbacks) => cbs.onError({ error: {} }));
		const onError = vi.fn();

		await signInWithEmail(asClient({ signIn: { email } }), {
			email: 'dev@example.com',
			password: 'pw',
			onSuccess: vi.fn(),
			onError
		});

		expect(onError).toHaveBeenCalledWith('Sign in failed.');
	});
});

// ---------------------------------------------------------------------------
// signUpWithEmail
// ---------------------------------------------------------------------------

describe('signUpWithEmail', () => {
	it('sends an email-verification OTP and advances to the otp step on success', async () => {
		const signUp = { email: vi.fn().mockResolvedValue({ error: null }) };
		const emailOtp = { sendVerificationOtp: vi.fn().mockResolvedValue({ error: null }) };
		const onStepChange = vi.fn();
		const onError = vi.fn();

		await signUpWithEmail(asClient({ signUp, emailOtp }), {
			name: 'Dev',
			email: 'dev@example.com',
			password: 'pw',
			onSuccess: vi.fn(),
			onError,
			onStepChange
		});

		expect(emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
			email: 'dev@example.com',
			type: 'email-verification'
		});
		expect(onStepChange).toHaveBeenCalledWith('otp');
		expect(onError).not.toHaveBeenCalled();
	});

	it('stops and reports when sign-up fails — without sending an OTP', async () => {
		const signUp = { email: vi.fn().mockResolvedValue({ error: { message: 'already exists' } }) };
		const emailOtp = { sendVerificationOtp: vi.fn() };
		const onStepChange = vi.fn();
		const onError = vi.fn();

		await signUpWithEmail(asClient({ signUp, emailOtp }), {
			name: 'Dev',
			email: 'dev@example.com',
			password: 'pw',
			onSuccess: vi.fn(),
			onError,
			onStepChange
		});

		expect(onError).toHaveBeenCalledWith('already exists');
		expect(emailOtp.sendVerificationOtp).not.toHaveBeenCalled();
		expect(onStepChange).not.toHaveBeenCalled();
	});

	// Regression guard: a failed OTP send (e.g. Resend sandbox rejecting a
	// non-owner address) must report the error and NOT advance to a dead OTP
	// screen.
	it('reports an OTP send failure and does not advance to the otp step', async () => {
		const signUp = { email: vi.fn().mockResolvedValue({ error: null }) };
		const emailOtp = {
			sendVerificationOtp: vi.fn().mockResolvedValue({ error: { message: 'send failed' } })
		};
		const onStepChange = vi.fn();
		const onError = vi.fn();

		await signUpWithEmail(asClient({ signUp, emailOtp }), {
			name: 'Dev',
			email: 'dev@example.com',
			password: 'pw',
			onSuccess: vi.fn(),
			onError,
			onStepChange
		});

		expect(onError).toHaveBeenCalledWith('send failed');
		expect(onStepChange).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// verifyOtpAndSignIn
// ---------------------------------------------------------------------------

describe('verifyOtpAndSignIn', () => {
	// Regression guard for the autoSignInAfterVerification fix: verifying the
	// OTP creates the session, so we resolve via onSuccess and must NOT make a
	// second (fragile) password sign-in call.
	it('verifies the code then resolves via onSuccess — no second sign-in call', async () => {
		const verifyEmail = vi.fn().mockResolvedValue({ error: null });
		const signInEmail = vi.fn();
		const onSuccess = vi.fn();
		const onError = vi.fn();

		await verifyOtpAndSignIn(
			asClient({ emailOtp: { verifyEmail }, signIn: { email: signInEmail } }),
			{ email: 'dev@example.com', password: 'pw', otp: '123456', onSuccess, onError }
		);

		expect(verifyEmail).toHaveBeenCalledWith({ email: 'dev@example.com', otp: '123456' });
		expect(onSuccess).toHaveBeenCalledOnce();
		expect(signInEmail).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});

	it('reports an invalid/expired code and does not resolve', async () => {
		const verifyEmail = vi.fn().mockResolvedValue({ error: { message: 'invalid otp' } });
		const onSuccess = vi.fn();
		const onError = vi.fn();

		await verifyOtpAndSignIn(asClient({ emailOtp: { verifyEmail } }), {
			email: 'dev@example.com',
			password: 'pw',
			otp: '000000',
			onSuccess,
			onError
		});

		expect(onError).toHaveBeenCalledWith('invalid otp');
		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
	it('does not call onError on success', async () => {
		const onError = vi.fn();
		await signOut(asClient({ signOut: vi.fn().mockResolvedValue({ error: null }) }), onError);
		expect(onError).not.toHaveBeenCalled();
	});

	it('reports an error on failure', async () => {
		const onError = vi.fn();
		await signOut(
			asClient({ signOut: vi.fn().mockResolvedValue({ error: { message: 'sign out failed' } }) }),
			onError
		);
		expect(onError).toHaveBeenCalledWith('sign out failed');
	});
});

// ---------------------------------------------------------------------------
// signInWithGoogle
// ---------------------------------------------------------------------------

describe('signInWithGoogle', () => {
	it('starts the Google social flow', async () => {
		const social = vi.fn().mockResolvedValue(undefined);
		const onError = vi.fn();

		await signInWithGoogle(asClient({ signIn: { social } }), onError);

		expect(social).toHaveBeenCalledWith({ provider: 'google' });
		expect(onError).not.toHaveBeenCalled();
	});

	it('reports a thrown error', async () => {
		const social = vi.fn().mockRejectedValue(new Error('popup blocked'));
		const onError = vi.fn();

		await signInWithGoogle(asClient({ signIn: { social } }), onError);

		expect(onError).toHaveBeenCalledWith('popup blocked');
	});
});
