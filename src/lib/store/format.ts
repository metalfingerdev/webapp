import { CLASS_LABELS } from '#convex/model/store/classes.js';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/** Paise to "₹1,234" (or "₹1,234.50"). Display only: all maths stays in integer paise. */
export const formatPrice = (paise: number) => rupees.format(paise / 100).replace(/\.00$/, '');

/** The percentage saved against the MRP, for a badge; 0 when there is no saving. */
export const discountPercent = (price: number, mrp: number) =>
	mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

/** "Class 1", "Mont-01", or a range such as "Class 1 to Class 5". Empty when not a class item. */
export const classRange = (from?: number, to?: number) => {
	if (from === undefined || to === undefined) return '';
	const a = CLASS_LABELS[from] ?? String(from);
	const b = CLASS_LABELS[to] ?? String(to);
	return a === b ? a : `${a} to ${b}`;
};

const dateTime = new Intl.DateTimeFormat('en-IN', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'Asia/Kolkata'
});
/** "7 Nov 2026", in India time */
export const formatDate = (ms: number) => dateTime.format(ms);

/** What a thrown Convex error says to the customer, without the server's wrapper text */
export const errorText = (error: unknown, fallback: string) => {
	const data = (error as { data?: unknown } | null)?.data;
	return typeof data === 'string' ? data : fallback;
};
