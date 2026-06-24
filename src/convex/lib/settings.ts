// convex/lib/settings.ts
import type { DatabaseReader } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';

export type Settings = Record<string, number>;

export async function loadSettings(db: DatabaseReader): Promise<Settings> {
	const rows = await db.query('settings').collect();

	// Explicitly typing 'r' as Doc<'settings'> satisfies the strict compiler
	return Object.fromEntries(rows.map((r: Doc<'settings'>) => [r.key, r.value]));
}
