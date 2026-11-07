// Which delivery zone serves a pincode: the zone that lists it, else the active fallback zone.
// Null means the shop does not deliver there (no listed zone and no fallback).
import type { Doc } from '../../_generated/dataModel.js';
import type { QueryCtx } from '../../_generated/server.js';

export const findZone = async (
	ctx: QueryCtx,
	pincode: string
): Promise<Doc<'deliveryZones'> | null> => {
	const listed = await ctx.db
		.query('zonePincodes')
		.withIndex('by_pincode', (q) => q.eq('pincode', pincode))
		.take(5);
	for (const row of listed) {
		const zone = await ctx.db.get('deliveryZones', row.zoneId);
		if (zone?.isActive) return zone;
	}
	return ctx.db
		.query('deliveryZones')
		.withIndex('by_isFallback_and_isActive', (q) => q.eq('isFallback', true).eq('isActive', true))
		.first();
};
