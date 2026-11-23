import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_CONSTANTS } from '../auth.constants';
import { getChannelOrder, phoneSignUpEmail, renderOtpSms } from './config';

describe('getChannelOrder', () => {
	beforeEach(() => {
		delete process.env.OTP_CHANNELS;
	});
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('defaults to textbee', () => {
		expect(getChannelOrder()).toEqual(['textbee']);
	});

	it('keeps the order it is given and ignores spaces and empty entries', () => {
		vi.stubEnv('OTP_CHANNELS', ' whatsapp, fast2sms,,textbee ');
		expect(getChannelOrder()).toEqual(['whatsapp', 'fast2sms', 'textbee']);
	});

	it('refuses a misspelt channel instead of silently sending nothing', () => {
		vi.stubEnv('OTP_CHANNELS', 'whatsapp,telegram');
		expect(() => getChannelOrder()).toThrow(/unknown channel "telegram"/);
	});
});

describe('renderOtpSms', () => {
	// Airtel drops P2P texts that open with the code or use OTP wording, so the code sits mid-sentence
	it('puts the code mid-sentence, names the app and avoids OTP wording', () => {
		const text = renderOtpSms('123456');
		expect(text).toContain(' 123456 ');
		expect(text.startsWith('123456')).toBe(false);
		expect(text).not.toMatch(/otp|code|do not share/i);
		expect(text).toContain(AUTH_CONSTANTS.brandName ?? 'My App');
	});
});

describe('phoneSignUpEmail', () => {
	// email.ts skips every .invalid address; a real domain here would mail strangers
	it('builds an address that can never be delivered to', () => {
		const email = phoneSignUpEmail('+919876543210');
		expect(email).toBe('919876543210@phone.invalid');
		expect(email.endsWith('.invalid')).toBe(true);
	});
});
