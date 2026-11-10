import { v } from 'convex/values';
import { action } from '../_generated/server';
import validateEmail from '../model/emails/validateEmail.js';
import { AUTH_CONSTANTS } from '../auth.constants';
import { components } from '../_generated/api';

/**
 * Validates the email address and returns whether the auth flow should
 * continue with sign-in or sign-up.
 */
export const checkEmailAvailabilityAndValidity = action({
	args: {
		email: v.string()
	},
	handler: async (ctx, args) => {
		const { email } = args;
		const user = await ctx.runQuery(components.betterAuth.user.getUserByEmail, { email });
		const exists = user !== null;

		if (exists) {
			// An account made with Google or a phone has no password to type, so the sign-in
			// form offers the ways it can sign in instead of a password field it can never pass.
			const credential = await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'account',
				where: [
					{ field: 'userId', value: user._id },
					{ field: 'providerId', value: 'credential' }
				]
			});
			return {
				valid: true,
				exists: true,
				hasPassword: credential !== null,
				email,
				reason: 'User with this email already exists'
			};
		}

		if (AUTH_CONSTANTS.validateEmails) {
			const result = await validateEmail(ctx, email);
			return {
				...result,
				exists: false,
				hasPassword: false
			};
		}

		return {
			valid: true,
			exists: false,
			hasPassword: false,
			email,
			reason: 'Email verification disabled'
		};
	}
});
