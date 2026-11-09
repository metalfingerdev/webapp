// Invoice numbers and the moment an invoice is issued. An order is invoiced once, when it ships
// (dictated 2026-11-09: the same rule for online and cash-on-delivery orders, so the invoice can go
// in the parcel and an order cancelled before it ships never uses up a number). What the invoice says
// about the seller and the tax is copied onto the order then, so editing settings or a product later
// never changes an invoice that was already issued.
import type { Doc } from '../../_generated/dataModel.js';
import type { MutationCtx } from '../../_generated/server.js';
import { taxByRateOf } from './pricing.js';
import { STORE_NAME } from './storeProfile.js';

const IST_OFFSET_MS = 330 * 60 * 1000;

/** The financial year a moment falls in, by India time: "2026-27" runs 1 April 2026 to 31 March 2027 */
export const financialYear = (ms: number) => {
	const ist = new Date(ms + IST_OFFSET_MS);
	const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
	return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

/** "AK/26-27/0001", or "26-27/0001" while no prefix is set */
export const formatInvoiceNumber = (prefix: string | undefined, year: string, n: number) => {
	const short = `${year.slice(2, 4)}-${year.slice(5)}`;
	const serial = String(n).padStart(4, '0');
	return prefix ? `${prefix}/${short}/${serial}` : `${short}/${serial}`;
};

/** Who the documents are from, as the settings say now. Business details are typed in /admin/settings. */
export const sellerFromSettings = (settings: Doc<'storeSettings'> | null) => ({
	name: settings?.legalName ?? settings?.businessName ?? STORE_NAME,
	address: settings?.address,
	gstin: settings?.gstin,
	phone: settings?.phone,
	email: settings?.email
});

/**
 * Gives the order its invoice, unless it has one already. The counter and the order change in the
 * same transaction, so two orders shipping at once can never get the same number.
 */
export const issueInvoice = async (ctx: MutationCtx, order: Doc<'orders'>, now: number) => {
	if (order.invoice) return;
	const year = financialYear(now);
	const counter = await ctx.db
		.query('invoiceCounters')
		.withIndex('by_financialYear', (q) => q.eq('financialYear', year))
		.first();
	let serial = 1;
	if (counter) {
		serial = counter.next;
		await ctx.db.patch('invoiceCounters', counter._id, { next: serial + 1 });
	} else {
		await ctx.db.insert('invoiceCounters', { financialYear: year, next: 2 });
	}

	const settings = await ctx.db.query('storeSettings').first();
	const items = await ctx.db
		.query('orderItems')
		.withIndex('by_orderId', (q) => q.eq('orderId', order._id))
		.take(100);
	await ctx.db.patch('orders', order._id, {
		invoice: {
			number: formatInvoiceNumber(settings?.invoicePrefix, year, serial),
			financialYear: year,
			issuedAt: now,
			seller: sellerFromSettings(settings),
			taxByRate: taxByRateOf(items)
		}
	});
};
