// Admin: delivery zones and their pincodes. Every function calls requireAppAdmin first.
// A pincode belongs to at most one zone, so it can never match two. The active fallback zone
// serves every pincode no zone lists; at most one zone is the fallback. Zones are hidden, never
// deleted: orders keep the zone's name and fee they were placed with.
import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { deliveryMethod, isIndianPincode } from '../validators.js';

const MAX_ZONES = 20;
const MAX_ZONE_PINCODES = 500;

export const list = query({
	args: {},
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		return await ctx.db.query('deliveryZones').withIndex('by_sortOrder').take(MAX_ZONES);
	}
});

/** The pincodes a zone lists, in order */
export const pincodes = query({
	args: { zoneId: v.id('deliveryZones') },
	returns: v.array(v.string()),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const rows = await ctx.db
			.query('zonePincodes')
			.withIndex('by_zoneId', (q) => q.eq('zoneId', args.zoneId))
			.take(MAX_ZONE_PINCODES);
		return rows.map((row) => row.pincode).sort();
	}
});

const isPaise = (value: number) => Number.isInteger(value) && value >= 0 && value <= 100_000_00;

/** Adds a zone (no zoneId) or changes one. Making a zone the fallback takes it off the others. */
export const save = mutation({
	args: {
		zoneId: v.optional(v.id('deliveryZones')),
		name: v.string(),
		method: deliveryMethod,
		fee: v.number(),
		freeFrom: v.number(),
		estimate: v.string(),
		isFallback: v.boolean(),
		isActive: v.boolean()
	},
	returns: v.id('deliveryZones'),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const name = args.name.trim();
		if (!name || name.length > 60) throw new ConvexError('A zone name is 1 to 60 characters');
		const estimate = args.estimate.trim();
		if (!estimate || estimate.length > 100) {
			throw new ConvexError('The delivery estimate is 1 to 100 characters');
		}
		if (!isPaise(args.fee) || !isPaise(args.freeFrom)) {
			throw new ConvexError('Enter the fee and free-delivery amount in rupees');
		}
		const fields = {
			name,
			method: args.method,
			fee: args.fee,
			freeFrom: args.freeFrom,
			estimate,
			isFallback: args.isFallback,
			isActive: args.isActive
		};

		let zoneId = args.zoneId;
		if (zoneId) {
			if (!(await ctx.db.get('deliveryZones', zoneId))) throw new ConvexError('Zone not found');
			await ctx.db.patch('deliveryZones', zoneId, fields);
		} else {
			const zones = await ctx.db.query('deliveryZones').withIndex('by_sortOrder').take(MAX_ZONES);
			if (zones.length >= MAX_ZONES) throw new ConvexError(`At most ${MAX_ZONES} zones`);
			const last = zones[zones.length - 1];
			zoneId = await ctx.db.insert('deliveryZones', {
				...fields,
				sortOrder: (last?.sortOrder ?? 0) + 1
			});
		}

		if (args.isFallback) {
			for (const flag of [true, false]) {
				const others = await ctx.db
					.query('deliveryZones')
					.withIndex('by_isFallback_and_isActive', (q) =>
						q.eq('isFallback', true).eq('isActive', flag)
					)
					.take(MAX_ZONES);
				for (const other of others) {
					if (other._id !== zoneId) {
						await ctx.db.patch('deliveryZones', other._id, { isFallback: false });
					}
				}
			}
		}
		return zoneId;
	}
});

/**
 * Replaces a zone's pincode list with the pasted text (any mix of spaces, commas and new lines).
 * Refused, with nothing changed, if a pincode is not 6 digits or already belongs to another zone.
 */
export const setPincodes = mutation({
	args: { zoneId: v.id('deliveryZones'), text: v.string() },
	returns: v.number(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const zone = await ctx.db.get('deliveryZones', args.zoneId);
		if (!zone) throw new ConvexError('Zone not found');

		const wanted = [...new Set(args.text.split(/[\s,;]+/).filter(Boolean))];
		const bad = wanted.filter((pincode) => !isIndianPincode(pincode));
		if (bad.length > 0) {
			throw new ConvexError(`Not a pincode: ${bad.slice(0, 5).join(', ')}`);
		}
		if (wanted.length > MAX_ZONE_PINCODES) {
			throw new ConvexError(`A zone lists at most ${MAX_ZONE_PINCODES} pincodes`);
		}

		const clashes: string[] = [];
		for (const pincode of wanted) {
			const rows = await ctx.db
				.query('zonePincodes')
				.withIndex('by_pincode', (q) => q.eq('pincode', pincode))
				.take(5);
			const other = rows.find((row) => row.zoneId !== args.zoneId);
			if (other) {
				const otherZone = await ctx.db.get('deliveryZones', other.zoneId);
				clashes.push(`${pincode} (${otherZone?.name ?? 'another zone'})`);
			}
		}
		if (clashes.length > 0) {
			throw new ConvexError(
				`Already in another zone: ${clashes.slice(0, 5).join(', ')}. Remove them there first.`
			);
		}

		const current = await ctx.db
			.query('zonePincodes')
			.withIndex('by_zoneId', (q) => q.eq('zoneId', args.zoneId))
			.take(MAX_ZONE_PINCODES);
		const keep = new Set(wanted);
		const have = new Set<string>();
		for (const row of current) {
			if (keep.has(row.pincode) && !have.has(row.pincode)) have.add(row.pincode);
			else await ctx.db.delete('zonePincodes', row._id);
		}
		for (const pincode of wanted) {
			if (!have.has(pincode)) await ctx.db.insert('zonePincodes', { zoneId: args.zoneId, pincode });
		}
		return wanted.length;
	}
});
