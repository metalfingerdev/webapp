import { createClient, type CreateAuth } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { components } from './_generated/api.js';
import { type DataModel } from './_generated/dataModel.js';
import { query } from './_generated/server.js';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import authConfig from './auth.config.js';
import { emailOTP } from 'better-auth/plugins';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth: CreateAuth<DataModel> = (ctx) => {
	const options: BetterAuthOptions = {
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		// Configure simple, non-verified email/password to get started
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false
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

					await resend.emails.send({
						from: 'onboarding@resend.dev',
						to: email,
						subject: flowType === 'sign-up' ? 'Welcome! Verify your account' : 'Your Sign-in Code',
						html: `<p>Your code is: <strong>${otp}</strong></p>`
					});
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
