import { describe, expect, it } from 'vitest';
import { shouldAdoptProviderEmail, verifiedEmailFromIdToken } from './linkedEmail';

const token = (claims: object) =>
	`x.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.y`;

describe('verifiedEmailFromIdToken', () => {
	it('returns the lower-cased email only when Google verified it', () => {
		expect(verifiedEmailFromIdToken(token({ email: 'A@Gmail.com', email_verified: true }))).toBe(
			'a@gmail.com'
		);
		expect(
			verifiedEmailFromIdToken(token({ email: 'a@gmail.com', email_verified: false }))
		).toBeNull();
		expect(verifiedEmailFromIdToken(token({ email: 'a@gmail.com' }))).toBeNull();
	});

	it('returns null for a missing or malformed token', () => {
		expect(verifiedEmailFromIdToken(undefined)).toBeNull();
		expect(verifiedEmailFromIdToken('not-a-token')).toBeNull();
		expect(verifiedEmailFromIdToken('x.%%%.y')).toBeNull();
	});
});

describe('shouldAdoptProviderEmail', () => {
	const base = { currentEmail: 'someone@phone.invalid', providerEmail: 'a@gmail.com' };

	it('replaces a phone placeholder with the provider email', () => {
		expect(shouldAdoptProviderEmail({ ...base, takenByAnotherUser: false })).toBe(true);
	});

	it('never replaces a real email, takes an email another user has, or adopts nothing', () => {
		expect(
			shouldAdoptProviderEmail({
				...base,
				currentEmail: 'me@example.test',
				takenByAnotherUser: false
			})
		).toBe(false);
		expect(shouldAdoptProviderEmail({ ...base, takenByAnotherUser: true })).toBe(false);
		expect(
			shouldAdoptProviderEmail({ ...base, providerEmail: null, takenByAnotherUser: false })
		).toBe(false);
	});
});
