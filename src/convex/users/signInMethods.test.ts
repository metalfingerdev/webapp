// The email step of sign-in must know whether an account has a password, or a Google-only account
// is sent to a password field it can never pass. Fails if that lookup breaks.
import { describe, expect, it } from 'vitest';
import { api, components } from '../_generated/api';
import { setup } from '../store/harness.testutils';

describe('checkEmailAvailabilityAndValidity', () => {
	it('tells an account with a password from one without', async () => {
		const { t, customer, otherCustomer } = await setup();
		await t.run(async (ctx) => {
			const now = Date.now();
			await ctx.runMutation(components.betterAuth.adapter.create, {
				input: {
					model: 'account',
					data: {
						accountId: otherCustomer.userId,
						providerId: 'credential',
						userId: otherCustomer.userId,
						password: 'hashed',
						createdAt: now,
						updatedAt: now
					}
				}
			});
			await ctx.runMutation(components.betterAuth.adapter.create, {
				input: {
					model: 'account',
					data: {
						accountId: 'google-sub',
						providerId: 'google',
						userId: customer.userId,
						createdAt: now,
						updatedAt: now
					}
				}
			});
		});
		const check = (email: string) =>
			t.action(api.users.actions.checkEmailAvailabilityAndValidity, { email });

		expect(await check('customer@example.test')).toMatchObject({ exists: true, hasPassword: false });
		expect(await check('other@example.test')).toMatchObject({ exists: true, hasPassword: true });
	});
});
