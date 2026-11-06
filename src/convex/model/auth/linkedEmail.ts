// When a Google account is linked to a user who signed up by phone, the user's email is still the
// `...@phone.invalid` placeholder, so the email step of sign-in can't find them and offers to
// register a second account. Phone-first apps solve this by taking the verified email from the
// provider once it is linked. Only a placeholder is ever replaced: a real email is an identity, and
// Better Auth deliberately never rebinds it on link.

/** The placeholder email phone-only users get (see src/convex/email.ts). */
export const isPlaceholderEmail = (email: string) => email.toLowerCase().endsWith('.invalid');

/**
 * The email Google vouches for, read from the OpenID token. The token comes straight from Google's
 * token endpoint over TLS, which is the case where OpenID Connect allows reading it without
 * checking the signature again.
 */
export const verifiedEmailFromIdToken = (idToken: string | null | undefined): string | null => {
	const payload = idToken?.split('.')[1];
	if (!payload) return null;
	try {
		const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
			email?: unknown;
			email_verified?: unknown;
		};
		const verified = claims.email_verified === true || claims.email_verified === 'true';
		return verified && typeof claims.email === 'string' && claims.email.includes('@')
			? claims.email.toLowerCase()
			: null;
	} catch {
		return null;
	}
};

/** Whether the linked provider's verified email should become the user's email. */
export const shouldAdoptProviderEmail = (args: {
	currentEmail: string;
	providerEmail: string | null;
	/** Another user already has the provider's email: never merge two people silently. */
	takenByAnotherUser: boolean;
}) =>
	args.providerEmail !== null && isPlaceholderEmail(args.currentEmail) && !args.takenByAnotherUser;
