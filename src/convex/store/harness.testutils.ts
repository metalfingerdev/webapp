// Shared test harness for store functions: a convex-test instance with the Better Auth component,
// and callers that are signed out, a customer, or an admin. The users are real rows in the
// component, so the guards run exactly as in production (safeGetAuthUser reads the session).
import { convexTest } from 'convex-test';
import schema from '../schema';
import authSchema from '../betterAuth/schema';
import { components } from '../_generated/api';
import { authModules, modules } from '../modules.testutils';

export const setup = async () => {
	const t = convexTest(schema, modules);
	t.registerComponent('betterAuth', authSchema, authModules);

	const signIn = async (name: string, role: 'user' | 'admin') => {
		const now = Date.now();
		const { userId, sessionId } = await t.run(async (ctx) => {
			const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
				input: {
					model: 'user',
					data: {
						name,
						email: `${name}@example.test`,
						emailVerified: true,
						role,
						createdAt: now,
						updatedAt: now
					}
				}
			})) as { _id: string };
			const session = (await ctx.runMutation(components.betterAuth.adapter.create, {
				input: {
					model: 'session',
					data: {
						userId: user._id,
						token: `token-${name}`,
						expiresAt: now + 3_600_000,
						createdAt: now,
						updatedAt: now
					}
				}
			})) as { _id: string };
			return { userId: user._id, sessionId: session._id };
		});
		return Object.assign(t.withIdentity({ subject: userId, sessionId }), { userId });
	};

	return {
		t,
		signedOut: t,
		customer: await signIn('customer', 'user'),
		otherCustomer: await signIn('other', 'user'),
		admin: await signIn('admin', 'admin')
	};
};
