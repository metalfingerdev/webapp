import { createClient, type CreateAuth } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { components } from './_generated/api.js';
import { type DataModel } from './_generated/dataModel.js';
import { action, query } from './_generated/server.js';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import authConfig from './auth.config.js';
import { emailOTP } from 'better-auth/plugins';
import { Resend } from 'resend';
import { ConvexError, v } from 'convex/values';

const resend = new Resend(process.env.RESEND_API_KEY!);

const siteUrl = process.env.SITE_URL!;

// Sender for OTP / verification mail. Must be an address on a domain you've
// verified in Resend — `onboarding@resend.dev` is Resend's sandbox and only
// delivers to your own account email, so real users never get the code.
// Set EMAIL_FROM per Convex deployment once your domain is verified.
const emailFrom = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth: CreateAuth<DataModel> = (ctx) => {
	const options: BetterAuthOptions = {
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		// Email/password sign-in is gated on a verified email: signUp no longer
		// auto-creates a session, and signIn is rejected until the OTP flow
		// (emailOTP plugin below) marks the address verified.
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true
		},
		// Verifying the OTP also creates the session, so the OTP screen signs the
		// user in directly — no separate password sign-in round trip afterward.
		emailVerification: {
			autoSignInAfterVerification: true
		},
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID as string,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
			}
		},

		plugins: [
			// The Convex plugin is required for Convex compatibility
			convex({
				authConfig,
				jwksRotateOnTokenGenerationError: true
			}),
			emailOTP({
				async sendVerificationOTP({ email, otp, type }) {
					// Define a type that includes your custom 'sign-up' value
					type AllowedTypes =
						| 'sign-in'
						| 'email-verification'
						| 'forget-password'
						| 'change-email'
						| 'sign-up';

					const flowType = type as AllowedTypes;

					// Resend returns { error } instead of throwing — swallowing it
					// here advances the UI to a dead OTP screen for mail that never
					// sent. Throw so better-auth fails the request and the client
					// surfaces the real reason (e.g. sandbox can only mail the
					// account owner until a domain is verified).
					const { error } = await resend.emails.send({
						from: emailFrom,
						to: email,
						subject: flowType === 'sign-up' ? 'Welcome! Verify your account' : 'Your Sign-in Code',
						html: `<p>Your code is: <strong>${otp}</strong></p>`
					});

					if (error) {
						throw new Error(`Failed to send verification email: ${error.message ?? error.name}`);
					}
				}
			})
		]
	};

	return betterAuth(options);
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
// In auth.ts
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return null;

		// Simple lookup by email, no ID joining issues
		const roleDoc = await ctx.db
			.query('userRoles')
			.withIndex('by_email', (q) => q.eq('email', user.email))
			.unique();

		return {
			...user,
			role: roleDoc?.role ?? 'customer'
		};
	}
});

// Looks up whether an email already has an account and which sign-in methods
// it uses. The signup form calls this so an existing email is routed to its
// real method ("continue with Google") instead of silently no-op'ing — Better
// Auth hides existence on signUp for anti-enumeration, so we surface it here
// deliberately (the consumer-standard tradeoff). Reads the Better Auth
// component's user/account tables via its adapter queries.
export const accountForEmail = query({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const normalized = email.trim().toLowerCase();

		const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: 'email', value: normalized }]
		})) as { _id: string } | null;

		if (!user) {
			return { exists: false, hasGoogle: false, hasPassword: false };
		}

		// One findOne per provider (where clauses are AND-ed) avoids paginating
		// findMany — a user only ever has a handful of linked accounts anyway.
		const hasProvider = async (providerId: string) =>
			(await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'account',
				where: [
					{ field: 'userId', value: user._id },
					{ field: 'providerId', value: providerId }
				]
			})) !== null;

		return {
			exists: true,
			hasGoogle: await hasProvider('google'),
			hasPassword: await hasProvider('credential')
		};
	}
});

// Returns the current (authenticated) user's linked sign-in methods, so the
// profile page can show "Set a password" only to accounts that don't have one
// (e.g. Google-only users). Session-scoped — not an enumeration endpoint.
export const myAuthMethods = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return null;

		const hasProvider = async (providerId: string) =>
			(await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'account',
				where: [
					{ field: 'userId', value: user._id },
					{ field: 'providerId', value: providerId }
				]
			})) !== null;

		return {
			hasPassword: await hasProvider('credential'),
			hasGoogle: await hasProvider('google')
		};
	}
});

// Adds a password to the *currently authenticated* account — the industry-
// standard way to link email/password to an OAuth-only user (being logged in
// satisfies "authenticate the existing account first"). Better Auth's
// setPassword links a credential only when none exists yet, and this runs in an
// action because password hashing needs randomness (disallowed in mutations).
export const setMyPassword = action({
	args: { newPassword: v.string() },
	handler: async (ctx, { newPassword }) => {
		const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
		// getAuth() types `auth` as the narrowed RegisterableAuth (no `.api`),
		// but at runtime it's the full Better Auth instance. Cast to the one
		// method we call.
		const fullAuth = auth as unknown as {
			api: {
				setPassword: (opts: {
					body: { newPassword: string };
					headers: Headers;
				}) => Promise<unknown>;
			};
		};
		try {
			await fullAuth.api.setPassword({ body: { newPassword }, headers });
		} catch (e) {
			throw new ConvexError(e instanceof Error ? e.message : 'Failed to set password.');
		}
		return { success: true };
	}
});

// Public query for testing - no auth required
export const getPublicData = query({
	args: {},
	handler: async () => {
		return {
			message: 'This is public data',
			timestamp: Date.now()
		};
	}
});
