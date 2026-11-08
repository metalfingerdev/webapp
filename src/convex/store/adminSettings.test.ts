import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import { setup } from './harness.testutils';

type T = Awaited<ReturnType<typeof setup>>['t'];

// Settings, plus a local zone listing 121001 and a fallback zone listing nothing.
const seed = (t: T) =>
	t.run(async (ctx) => {
		await ctx.db.insert('storeSettings', {
			businessName: 'Test',
			returnWindowDays: 7,
			currentSession: '2026-27',
			placedOrdersOpen: true
		});
		const zone = (name: string, isFallback: boolean, sortOrder: number) =>
			ctx.db.insert('deliveryZones', {
				name,
				method: isFallback ? 'courier' : 'local',
				fee: 4000,
				freeFrom: 50000,
				estimate: 'soon',
				isFallback,
				isActive: true,
				sortOrder
			});
		const local = await zone('Local', false, 1);
		const rest = await zone('Rest', true, 2);
		await ctx.db.insert('zonePincodes', { zoneId: local, pincode: '121001' });
		return { local, rest };
	});

const state = (t: T) =>
	t.run(async (ctx) => ({
		settings: await ctx.db.query('storeSettings').first(),
		pincodes: (await ctx.db.query('zonePincodes').take(50)).map((row) => [row.zoneId, row.pincode])
	}));

describe('admin settings', () => {
	it('refuses signed-out callers and customers, and changes nothing', async () => {
		const { t, signedOut, customer } = await setup();
		const { local } = await seed(t);
		const before = await state(t);
		const settings = {
			businessName: 'Taken',
			returnWindowDays: 7,
			currentSession: '2026-27',
			codEnabled: true,
			placedOrdersOpen: false
		};

		for (const caller of [signedOut, customer]) {
			const calls = [
				() => caller.query(api.store.admin.settings.get, {}),
				() => caller.mutation(api.store.admin.settings.save, settings),
				() => caller.query(api.store.admin.zones.list, {}),
				() => caller.query(api.store.admin.zones.pincodes, { zoneId: local }),
				() =>
					caller.mutation(api.store.admin.zones.save, {
						name: 'X',
						method: 'courier',
						fee: 0,
						freeFrom: 0,
						estimate: 'x',
						isFallback: true,
						isActive: true
					}),
				() => caller.mutation(api.store.admin.zones.setPincodes, { zoneId: local, text: '110001' }),
				() => caller.query(api.store.admin.payments.checkSetup, {}),
				() => caller.query(api.store.admin.payments.list, {})
			];
			for (const call of calls) await expect(call()).rejects.toThrow(/Not authenticated|Forbidden/);
		}
		expect(await state(t)).toEqual(before);
	});

	it('refuses a bad GSTIN or invoice prefix and keeps the saved settings', async () => {
		const { t, admin } = await setup();
		await seed(t);
		const current = await admin.query(api.store.admin.settings.get, {});
		const before = await state(t);

		await expect(
			admin.mutation(api.store.admin.settings.save, { ...current, gstin: '06ABC' })
		).rejects.toThrow(/GSTIN/);
		await expect(
			admin.mutation(api.store.admin.settings.save, { ...current, invoicePrefix: 'AK1' })
		).rejects.toThrow(/prefix/);
		expect(await state(t)).toEqual(before);
	});
});

describe('admin zones', () => {
	it('refuses a pincode another zone already lists, changing nothing', async () => {
		const { t, admin } = await setup();
		const { rest } = await seed(t);
		const before = await state(t);

		await expect(
			admin.mutation(api.store.admin.zones.setPincodes, { zoneId: rest, text: '110001, 121001' })
		).rejects.toThrow(/121001 \(Local\)/);
		expect(await state(t)).toEqual(before);
	});

	it('keeps one fallback zone: making a new one takes it off the old', async () => {
		const { t, admin } = await setup();
		const { rest } = await seed(t);
		const zoneId = await admin.mutation(api.store.admin.zones.save, {
			name: 'India',
			method: 'courier',
			fee: 9900,
			freeFrom: 0,
			estimate: 'a week',
			isFallback: true,
			isActive: true
		});
		const zones = await admin.query(api.store.admin.zones.list, {});
		expect(zones.filter((zone) => zone.isFallback).map((zone) => zone._id)).toEqual([zoneId]);
		expect(zones.find((zone) => zone._id === rest)?.isFallback).toBe(false);
	});
});
