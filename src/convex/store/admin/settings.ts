// Admin: the shop's settings row (business details, rules, the "taking orders" switch). Every
// function calls requireAppAdmin first. Checks are on format only: whether the shop is registered
// for GST and what an invoice must say are for the client's CA (store-app → admin.md).
import { ConvexError, v, type Infer } from 'convex/values';
import { mutation, query } from '../../_generated/server.js';
import { normalizeIndianMobile } from '../../otp/phone.js';
import { requireAppAdmin } from '../../model/store/access.js';
import {
	PLACEHOLDER_COD_ENABLED,
	PLACEHOLDER_RETURN_WINDOW_DAYS,
	PLACEHOLDER_SESSION,
	STORE_NAME
} from '../../model/store/storeProfile.js';
import { isSession } from '../validators.js';

const settingsShape = v.object({
	businessName: v.string(),
	legalName: v.optional(v.string()),
	phone: v.optional(v.string()),
	whatsapp: v.optional(v.string()),
	email: v.optional(v.string()),
	address: v.optional(v.string()),
	gstin: v.optional(v.string()),
	invoicePrefix: v.optional(v.string()),
	returnWindowDays: v.number(),
	currentSession: v.string(),
	codEnabled: v.boolean(),
	placedOrdersOpen: v.boolean()
});
type Settings = Infer<typeof settingsShape>;

const MAX_RETURN_WINDOW_DAYS = 30;

/** The settings as the form edits them; the placeholders when the row doesn't exist yet. */
export const get = query({
	args: {},
	returns: settingsShape,
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const row = await ctx.db.query('storeSettings').first();
		return {
			businessName: row?.businessName ?? STORE_NAME,
			legalName: row?.legalName,
			phone: row?.phone,
			whatsapp: row?.whatsapp,
			email: row?.email,
			address: row?.address,
			gstin: row?.gstin,
			invoicePrefix: row?.invoicePrefix,
			returnWindowDays: row?.returnWindowDays ?? PLACEHOLDER_RETURN_WINDOW_DAYS,
			currentSession: row?.currentSession ?? PLACEHOLDER_SESSION,
			codEnabled: row?.codEnabled ?? PLACEHOLDER_COD_ENABLED,
			placedOrdersOpen: row?.placedOrdersOpen ?? true
		};
	}
});

/** Blank means not set */
const optionalText = (value: string | undefined, max: number, label: string) => {
	const trimmed = value?.trim() ?? '';
	if (!trimmed) return undefined;
	if (trimmed.length > max) throw new ConvexError(`${label} is at most ${max} characters`);
	return trimmed;
};

const optionalMobile = (value: string | undefined, label: string) => {
	if (!value?.trim()) return undefined;
	const phone = normalizeIndianMobile(value);
	if (!phone) throw new ConvexError(`${label}: enter a 10-digit Indian mobile number`);
	return phone;
};

const checkSettings = (input: Settings): Settings => {
	const businessName = input.businessName.trim();
	if (!businessName || businessName.length > 80) {
		throw new ConvexError('The shop name is 1 to 80 characters');
	}
	const email = optionalText(input.email, 120, 'Email')?.toLowerCase();
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		throw new ConvexError('Enter a valid email');
	const gstin = optionalText(input.gstin, 15, 'GSTIN')?.toUpperCase();
	if (gstin && !/^\d{2}[0-9A-Z]{13}$/.test(gstin)) {
		throw new ConvexError('A GSTIN is 15 letters and digits, starting with 2 digits');
	}
	const invoicePrefix = optionalText(input.invoicePrefix, 3, 'Invoice prefix')?.toUpperCase();
	if (invoicePrefix && !/^[A-Z]{1,3}$/.test(invoicePrefix)) {
		throw new ConvexError('The invoice prefix is 1 to 3 letters');
	}
	if (
		!Number.isInteger(input.returnWindowDays) ||
		input.returnWindowDays < 0 ||
		input.returnWindowDays > MAX_RETURN_WINDOW_DAYS
	) {
		throw new ConvexError(`The return window is 0 to ${MAX_RETURN_WINDOW_DAYS} days`);
	}
	const currentSession = input.currentSession.trim();
	if (!isSession(currentSession)) throw new ConvexError('A session looks like 2026-27');
	return {
		businessName,
		legalName: optionalText(input.legalName, 120, 'The legal name'),
		phone: optionalMobile(input.phone, 'Phone'),
		whatsapp: optionalMobile(input.whatsapp, 'WhatsApp'),
		email,
		address: optionalText(input.address, 300, 'The address'),
		gstin,
		invoicePrefix,
		returnWindowDays: input.returnWindowDays,
		currentSession,
		codEnabled: input.codEnabled,
		placedOrdersOpen: input.placedOrdersOpen
	};
};

/** Saves the whole form. Blank optional fields are cleared. */
export const save = mutation({
	args: settingsShape,
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const settings = checkSettings(args);
		const row = await ctx.db.query('storeSettings').first();
		if (row) await ctx.db.patch('storeSettings', row._id, settings);
		else await ctx.db.insert('storeSettings', settings);
		return null;
	}
});
