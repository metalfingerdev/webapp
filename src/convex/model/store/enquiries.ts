// Product On Demand: the rules for an enquiry and the email that tells the shop about it.
import { ConvexError } from 'convex/values';
import type { MutationCtx } from '../../_generated/server.js';
import { resend } from '../../email.js';
import { normalizeIndianMobile } from '../../otp/phone.js';
import { escapeHtml, heading, paragraph, renderBaseEmail } from '../emails/templates/baseEmail.js';
import { CLASS_OPTIONS } from './classes.js';
import { ENQUIRY_PROMISE } from './storeProfile.js';

export const MAX_ENQUIRY_NOTE = 1000;

/** The class choices on the form, in school order. Stored as the label so the inbox reads plainly. */
export const ENQUIRY_CLASSES: string[] = CLASS_OPTIONS;

export type EnquiryInput = {
	name: string;
	phone: string;
	email: string;
	bookName: string;
	author?: string;
	classLevel?: string;
};

const text = (value: string, max: number, label: string) => {
	const trimmed = value.trim();
	if (!trimmed) throw new ConvexError(`${label} is required`);
	if (trimmed.length > max) throw new ConvexError(`${label} is at most ${max} characters`);
	return trimmed;
};

/** Format checks only: trims, normalises the phone to +91, lower-cases the email. */
export const checkEnquiry = (input: EnquiryInput) => {
	const name = text(input.name, 80, 'Your name');
	const phone = normalizeIndianMobile(input.phone);
	if (!phone) throw new ConvexError('Enter a 10-digit Indian mobile number');
	const email = text(input.email, 120, 'Email').toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError('Enter a valid email');
	const bookName = text(input.bookName, 150, 'Book name');
	const author = input.author?.trim() ? text(input.author, 100, 'Author') : undefined;
	const classLevel = input.classLevel?.trim() || undefined;
	if (classLevel && !ENQUIRY_CLASSES.includes(classLevel)) {
		throw new ConvexError('Pick a class from the list');
	}
	return { name, phone, email, bookName, author, classLevel };
};

const row = (label: string, value?: string) =>
	value ? paragraph(`${label}: <strong>${escapeHtml(value)}</strong>`) : '';

/**
 * Tells the shop. Goes to the shop email typed into /admin/settings; skipped when that is empty or
 * no sender address is set (no domain yet). A failure here never loses the enquiry.
 */
export const sendEnquiryEmail = async (
	ctx: MutationCtx,
	enquiry: ReturnType<typeof checkEnquiry> & { number: string }
) => {
	const from = process.env.EMAIL_SEND_FROM;
	if (!from) return;
	const settings = await ctx.db.query('storeSettings').first();
	const to = settings?.email;
	if (!to) return;
	try {
		await resend.sendEmail(ctx, {
			from,
			to,
			subject: `Product On Demand ${enquiry.number}: ${enquiry.bookName.slice(0, 60)}`,
			html: renderBaseEmail({
				children: [
					heading(`New enquiry ${enquiry.number}`),
					row('Book', enquiry.bookName),
					row('Author', enquiry.author),
					row('Class', enquiry.classLevel),
					row('Name', enquiry.name),
					row('Phone', enquiry.phone),
					row('Email', enquiry.email)
				].join(''),
				previewText: `Enquiry for ${enquiry.bookName}`
			})
		});
	} catch (error) {
		console.error('[enquiry] email not sent', enquiry.number, error);
	}
};

/**
 * Who gets a copy of the enquiry: only a signed-in parent, at their own verified email, when that is
 * the email typed into the form. Why: the form is open to anyone, so mailing whatever address is
 * typed would let a stranger use the shop to send mail to people who never asked for it.
 */
export const copyRecipient = (
	user: { email: string; emailVerified: boolean } | null | undefined,
	typedEmail: string
) => {
	if (!user?.emailVerified) return null;
	const email = user.email.toLowerCase();
	if (email.endsWith('.invalid') || email !== typedEmail.trim().toLowerCase()) return null;
	return email;
};

/** The parent's copy: the enquiry number and what the shop does next. Same skips as the shop's. */
export const sendEnquiryCopy = async (
	ctx: MutationCtx,
	enquiry: ReturnType<typeof checkEnquiry> & { number: string },
	to: string
) => {
	const from = process.env.EMAIL_SEND_FROM;
	if (!from) return;
	try {
		await resend.sendEmail(ctx, {
			from,
			to,
			subject: `Your enquiry ${enquiry.number}: ${enquiry.bookName.slice(0, 60)}`,
			html: renderBaseEmail({
				children: [
					heading(`We have your enquiry ${enquiry.number}`),
					row('Book', enquiry.bookName),
					row('Author', enquiry.author),
					row('Class', enquiry.classLevel),
					paragraph(escapeHtml(ENQUIRY_PROMISE))
				].join(''),
				previewText: ENQUIRY_PROMISE
			})
		});
	} catch (error) {
		console.error('[enquiry] copy not sent', enquiry.number, error);
	}
};
