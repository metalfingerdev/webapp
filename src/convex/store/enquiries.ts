// Product On Demand, the customer side: one public form. Anyone may send an enquiry, signed in or
// not, so the limits are per phone number and for the whole shop (model/store/rateLimits.ts).
import { v } from 'convex/values';
import { mutation } from '../_generated/server.js';
import { authComponent } from '../auth.js';
import {
	checkEnquiry,
	copyRecipient,
	sendEnquiryCopy,
	sendEnquiryEmail
} from '../model/store/enquiries.js';
import { readableNumber } from '../model/store/numbers.js';
import { enquiryRateLimiter } from '../model/store/rateLimits.js';

// Deliberately public (no guard): a parent asking for a book that is not listed has no account.
export const submit = mutation({
	args: {
		name: v.string(),
		phone: v.string(),
		email: v.string(),
		bookName: v.string(),
		author: v.optional(v.string()),
		classLevel: v.optional(v.string())
	},
	returns: v.object({ number: v.string() }),
	handler: async (ctx, args) => {
		const enquiry = checkEnquiry(args);
		await enquiryRateLimiter.limit(ctx, 'enquiryGlobal', { throws: true });
		await enquiryRateLimiter.limit(ctx, 'enquiryPerPhone', { key: enquiry.phone, throws: true });

		let number = readableNumber('EQ', 6);
		while (
			await ctx.db
				.query('enquiries')
				.withIndex('by_number', (q) => q.eq('number', number))
				.first()
		) {
			number = readableNumber('EQ', 6);
		}
		await ctx.db.insert('enquiries', {
			number,
			...enquiry,
			status: 'new',
			createdAt: Date.now()
		});
		await sendEnquiryEmail(ctx, { ...enquiry, number });
		// Signed in is not required; it only decides whether the parent gets a copy (copyRecipient)
		const copyTo = copyRecipient(await authComponent.safeGetAuthUser(ctx), enquiry.email);
		if (copyTo) await sendEnquiryCopy(ctx, { ...enquiry, number }, copyTo);
		return { number };
	}
});
