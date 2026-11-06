import { createAuthClient } from 'better-auth/svelte';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { emailOTPClient } from 'better-auth/client/plugins'; // 1. Import this

export const authClient = createAuthClient({
	plugins: [convexClient(), emailOTPClient()]
});
