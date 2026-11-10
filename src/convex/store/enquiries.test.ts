// Product On Demand: anyone can send an enquiry (within limits), and only an admin can read or work
// the inbox. Each test fails if one of those breaks.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvexError } from 'convex/values';
import { api } from '../_generated/api';
import { copyRecipient } from '../model/store/enquiries';
import { setup } from './harness.testutils';

// The rate limiter is a component convex-test does not mount; fake it, with a real per-key count
const fakes = vi.hoisted(() => ({ used: new Map<string, number>() }));
vi.mock('../model/store/rateLimits', () => ({
	enquiryRateLimiter: {
		limit: async (_ctx: unknown, name: string, opts?: { key?: string }) => {
			const key = `${name}:${opts?.key ?? ''}`;
			const used = (fakes.used.get(key) ?? 0) + 1;
			fakes.used.set(key, used);
			if (name === 'enquiryPerPhone' && used > 3) throw new ConvexError('Rate limited');
		}
	}
}));
beforeEach(() => fakes.used.clear());

const form = {
	name: 'Test Parent',
	phone: '98765 43210', // allow-identifier: made-up test number
	email: 'parent@example.test',
	bookName: 'Some Rare Book'
};

describe('submit', () => {
	it('takes an enquiry from a signed-out visitor and files it as new', async () => {
		const { signedOut, admin } = await setup();
		const { number } = await signedOut.mutation(api.store.enquiries.submit, {
			...form,
			classLevel: 'Class 3'
		});
		expect(number).toMatch(/^EQ-[A-Z2-9]{6}$/);
		const page = await admin.query(api.store.admin.enquiries.list, {
			status: 'new',
			paginationOpts: { numItems: 10, cursor: null }
		});
		expect(page.page).toHaveLength(1);
		expect(page.page[0]).toMatchObject({
			number,
			phone: '+919876543210', // allow-identifier: made-up test number
			status: 'new'
		});
	});

	it('refuses a bad phone, an empty book name and an unknown class', async () => {
		const { signedOut } = await setup();
		const submit = (extra: object) =>
			signedOut.mutation(api.store.enquiries.submit, { ...form, ...extra });
		await expect(submit({ phone: '12345' })).rejects.toThrow(/10-digit/);
		await expect(submit({ bookName: '   ' })).rejects.toThrow(/required/);
		await expect(submit({ classLevel: 'Class 99' })).rejects.toThrow(/class/i);
	});

	it('stops the fourth enquiry from one phone in the hour', async () => {
		const { signedOut } = await setup();
		for (let i = 0; i < 3; i++) await signedOut.mutation(api.store.enquiries.submit, form);
		await expect(signedOut.mutation(api.store.enquiries.submit, form)).rejects.toThrow();
	});
});

describe('the inbox', () => {
	it('is closed to signed-out visitors and customers, open to an admin', async () => {
		const { signedOut, customer, admin } = await setup();
		await signedOut.mutation(api.store.enquiries.submit, form);
		const opts = { status: 'new' as const, paginationOpts: { numItems: 10, cursor: null } };
		for (const caller of [signedOut, customer]) {
			await expect(caller.query(api.store.admin.enquiries.list, opts)).rejects.toThrow();
			await expect(caller.query(api.store.admin.enquiries.countNew, {})).rejects.toThrow();
		}
		expect(await admin.query(api.store.admin.enquiries.countNew, {})).toBe(1);
	});

	it('lets only an admin change the status and note', async () => {
		const { signedOut, customer, admin } = await setup();
		await signedOut.mutation(api.store.enquiries.submit, form);
		const page = await admin.query(api.store.admin.enquiries.list, {
			status: 'new',
			paginationOpts: { numItems: 10, cursor: null }
		});
		const id = page.page[0]._id;
		await expect(
			customer.mutation(api.store.admin.enquiries.update, { id, status: 'closed' })
		).rejects.toThrow();
		await admin.mutation(api.store.admin.enquiries.update, {
			id,
			status: 'quoted',
			note: 'Called, ₹300'
		});
		expect(await admin.query(api.store.admin.enquiries.get, { id })).toMatchObject({
			status: 'quoted',
			note: 'Called, ₹300'
		});
		expect(await admin.query(api.store.admin.enquiries.countNew, {})).toBe(0);
	});
});

describe('the copy to the parent', () => {
	const verified = { email: 'parent@example.test', emailVerified: true };

	it('goes only to a signed-in parent’s own verified email, never to whatever was typed', () => {
		expect(copyRecipient(null, 'parent@example.test')).toBeNull();
		expect(copyRecipient({ ...verified, emailVerified: false }, 'parent@example.test')).toBeNull();
		expect(copyRecipient(verified, 'stranger@example.test')).toBeNull();
		const phoneOnly = { email: '919800000000@phone.invalid', emailVerified: true };
		expect(copyRecipient(phoneOnly, phoneOnly.email)).toBeNull();
		expect(copyRecipient(verified, 'parent@example.test')).toBe('parent@example.test');
	});
});
