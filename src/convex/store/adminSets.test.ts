import { describe, expect, it } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { setup } from './harness.testutils';

type T = Awaited<ReturnType<typeof setup>>['t'];

// A school with a hidden "Class 1" book set in 2026-27, a book, and a uniform piece of another school.
const seed = (t: T) =>
	t.run(async (ctx) => {
		const categoryId = await ctx.db.insert('categories', {
			name: 'Books',
			slug: 'books',
			sortOrder: 1,
			isActive: true
		});
		const schoolId = await ctx.db.insert('schools', {
			name: 'School A',
			slug: 'school-a',
			isActive: true,
			sortOrder: 1
		});
		const otherSchoolId = await ctx.db.insert('schools', {
			name: 'School B',
			slug: 'school-b',
			isActive: true,
			sortOrder: 2
		});
		const product = (title: string, extra: object = {}) =>
			ctx.db.insert('products', {
				title,
				slug: title.toLowerCase(),
				categoryId,
				kind: 'book',
				hsn: '4901',
				gstRate: 0,
				isActive: true,
				searchText: title,
				...extra
			});
		const variant = (productId: Awaited<ReturnType<typeof product>>) =>
			ctx.db.insert('productVariants', {
				productId,
				label: 'Default',
				mrp: 100_00,
				price: 100_00,
				stock: 5,
				lowStockAt: 1,
				sortOrder: 1,
				isActive: true
			});
		const bookId = await product('Maths');
		const bookVariantId = await variant(bookId);
		const otherBookId = await product('Hindi');
		const otherBookVariantId = await variant(otherBookId);
		const shirtId = await product('Shirt', {
			kind: 'uniform',
			schoolId: otherSchoolId,
			gender: 'boys',
			uniformType: 'regular',
			part: 'top'
		});
		await variant(shirtId);
		const setId = await ctx.db.insert('schoolSets', {
			schoolId,
			type: 'books',
			label: 'Class 1',
			classFrom: 1,
			classTo: 1,
			session: '2026-27',
			sortOrder: 1,
			isActive: false
		});
		return { schoolId, setId, bookId, bookVariantId, otherBookVariantId, shirtId };
	});

const setsIn = (t: T, schoolId: Id<'schools'>, session: string) =>
	t.run(async (ctx) => {
		const sets = await ctx.db
			.query('schoolSets')
			.withIndex('by_schoolId_and_session_and_sortOrder', (q) =>
				q.eq('schoolId', schoolId).eq('session', session)
			)
			.take(10);
		const lines = [];
		for (const set of sets) {
			lines.push(
				...(await ctx.db
					.query('setItems')
					.withIndex('by_setId_and_sortOrder', (q) => q.eq('setId', set._id))
					.take(10))
			);
		}
		return { sets, lines };
	});

describe('admin schools and sets access', () => {
	it('refuses signed-out callers and customers, and changes nothing', async () => {
		const { t, signedOut, customer } = await setup();
		const { schoolId, setId, bookId } = await seed(t);
		const set = { label: 'X', classFrom: 1, classTo: 1 };

		for (const caller of [signedOut, customer]) {
			const calls = [
				() => caller.query(api.store.admin.schools.list, {}),
				() => caller.mutation(api.store.admin.schools.create, { name: 'New' }),
				() =>
					caller.mutation(api.store.admin.schools.update, {
						schoolId,
						name: 'Renamed',
						isActive: false
					}),
				() => caller.mutation(api.store.admin.schools.move, { schoolId, direction: 'down' }),
				() => caller.query(api.store.admin.sets.get, { setId }),
				() =>
					caller.mutation(api.store.admin.sets.create, {
						schoolId,
						session: '2026-27',
						type: 'books',
						...set
					}),
				() => caller.mutation(api.store.admin.sets.update, { setId, ...set }),
				() => caller.mutation(api.store.admin.sets.setActive, { setId, isActive: true }),
				() =>
					caller.mutation(api.store.admin.sets.addLine, { setId, productId: bookId, quantity: 1 }),
				() =>
					caller.mutation(api.store.admin.sets.copyToSession, {
						schoolId,
						from: '2026-27',
						to: '2027-28'
					})
			];
			for (const call of calls) await expect(call()).rejects.toThrow(/Not authenticated|Forbidden/);
		}
		expect(await t.run((ctx) => ctx.db.get('schools', schoolId))).toMatchObject({
			name: 'School A',
			isActive: true
		});
		const { sets, lines } = await setsIn(t, schoolId, '2026-27');
		expect(sets).toMatchObject([{ label: 'Class 1', isActive: false }]);
		expect(lines).toEqual([]);
	});
});

describe('set lines and publishing', () => {
	it('refuses to publish an empty set, and a set with a hidden product', async () => {
		const { t, admin } = await setup();
		const { setId, bookId } = await seed(t);

		await expect(
			admin.mutation(api.store.admin.sets.setActive, { setId, isActive: true })
		).rejects.toThrow(/no lines/);

		await admin.mutation(api.store.admin.sets.addLine, { setId, productId: bookId, quantity: 1 });
		await t.run((ctx) => ctx.db.patch('products', bookId, { isActive: false }));
		await expect(
			admin.mutation(api.store.admin.sets.setActive, { setId, isActive: true })
		).rejects.toThrow(/hidden/);
		expect((await t.run((ctx) => ctx.db.get('schoolSets', setId)))!.isActive).toBe(false);

		await t.run((ctx) => ctx.db.patch('products', bookId, { isActive: true }));
		await admin.mutation(api.store.admin.sets.setActive, { setId, isActive: true });
		expect((await t.run((ctx) => ctx.db.get('schoolSets', setId)))!.isActive).toBe(true);
	});

	it("refuses a line of the wrong kind, another school's uniform, or another product's size", async () => {
		const { t, admin } = await setup();
		const { setId, bookId, otherBookVariantId, shirtId, schoolId } = await seed(t);

		await expect(
			admin.mutation(api.store.admin.sets.addLine, { setId, productId: shirtId, quantity: 1 })
		).rejects.toThrow(/not uniform pieces/);
		await expect(
			admin.mutation(api.store.admin.sets.addLine, {
				setId,
				productId: bookId,
				variantId: otherBookVariantId,
				quantity: 1
			})
		).rejects.toThrow(/not one of this product/);

		const uniformSetId = await admin.mutation(api.store.admin.sets.create, {
			schoolId,
			session: '2026-27',
			type: 'uniform',
			label: 'Boys regular',
			classFrom: 1,
			classTo: 5,
			gender: 'boys',
			uniformType: 'regular'
		});
		await expect(
			admin.mutation(api.store.admin.sets.addLine, {
				setId: uniformSetId,
				productId: shirtId,
				quantity: 1
			})
		).rejects.toThrow(/another school/);
		expect((await setsIn(t, schoolId, '2026-27')).lines).toEqual([]);
	});
});

describe('copy to the next session', () => {
	it('copies sets and lines hidden, leaves the source alone, and refuses a second copy', async () => {
		const { t, admin } = await setup();
		const { schoolId, setId, bookId, bookVariantId } = await seed(t);
		await admin.mutation(api.store.admin.sets.addLine, { setId, productId: bookId, quantity: 2 });
		await admin.mutation(api.store.admin.sets.setActive, { setId, isActive: true });
		const before = await setsIn(t, schoolId, '2026-27');

		await expect(
			admin.mutation(api.store.admin.sets.copyToSession, {
				schoolId,
				from: '2026-27',
				to: '2027-28'
			})
		).resolves.toBe(1);

		const copy = await setsIn(t, schoolId, '2027-28');
		expect(copy.sets).toMatchObject([{ label: 'Class 1', session: '2027-28', isActive: false }]);
		expect(copy.lines).toMatchObject([
			{ setId: copy.sets[0]._id, productId: bookId, variantId: bookVariantId, quantity: 2 }
		]);
		expect(await setsIn(t, schoolId, '2026-27')).toEqual(before);

		await expect(
			admin.mutation(api.store.admin.sets.copyToSession, {
				schoolId,
				from: '2026-27',
				to: '2027-28'
			})
		).rejects.toThrow(/already has sets/);
		expect((await setsIn(t, schoolId, '2027-28')).lines).toHaveLength(1);
	});
});
