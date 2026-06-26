// convex/lib/settings.ts
import type { DatabaseReader } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';

export type Settings = Record<string, number>;

// Baseline so pricing works before the `settings` table is seeded (prototype).
// Money values are in paise; GST rates are basis points (1800 => 18%). Rows in
// the `settings` table override these per-key. Replace with the client's real
// numbers later — especially the shipping formula.
export const DEFAULT_SETTINGS: Settings = {
	'gst.rate.5': 500,
	'gst.rate.12': 1200,
	'gst.rate.18': 1800,
	'shipping.freeThreshold': 500000, // ₹5000 — free shipping above this subtotal
	'shipping.perKgRate': 4000, // ₹40 per kg; used (weight-based) whenever > 0
	'shipping.flatRate': 5000 // ₹50 flat — fallback when perKgRate is 0
};

export async function loadSettings(db: DatabaseReader): Promise<Settings> {
	const rows = await db.query('settings').collect();

	// Explicitly typing 'r' as Doc<'settings'> satisfies the strict compiler
	const overrides = Object.fromEntries(rows.map((r: Doc<'settings'>) => [r.key, r.value]));

	// DB rows override the defaults; missing keys fall back so the math never
	// produces undefined/NaN.
	return { ...DEFAULT_SETTINGS, ...overrides };
}
