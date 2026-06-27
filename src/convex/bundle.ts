// convex/bundle.ts

import { query, mutation } from './_generated/server.js';
import type { DatabaseReader } from './_generated/server.js';
import type { Doc } from './_generated/dataModel.js';
import { v } from 'convex/values';
import { requireElevated } from './dashboard.js';
import { slugify } from './slugs.js';

async function buildBundleDoc(db: DatabaseReader, bundle: Doc<'bundles'>) {
	const school = await db.get(bundle.schoolId);
	const rows = await db
		.query('bundleItems')
		.withIndex('by_bundle', (q) => q.eq('bundleId', bundle._id))
		.collect();

	const items = (
		await Promise.all(
			rows.map(async (r) => {
				const p = await db.get(r.productId);
				if (!p) return null;
				return {
					productId: p._id,
					name: p.name,
					slug: p.slug ?? '',
					category: p.category,
					salePrice: p.salePrice,
					stock: p.stock,
					imageUrl: p.imageUrl,
					quantity: r.quantity
				};
			})
		)
	).filter((x): x is NonNullable<typeof x> => x !== null);

	return {
		_id: bundle._id,
		grade: bundle.grade,
		schoolId: bundle.schoolId,
		schoolName: school?.name ?? 'School',
		schoolSlug: school?.slug ?? '',
		items,
		total: items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0)
	};
}

// ─── Admin: manage bundle contents ───────────────────────────────────────────

export const setBundleItem = mutation({
	args: {
		schoolId: v.id('schools'),
		grade: v.string(),
		productId: v.id('products'),
		quantity: v.number()
	},
	handler: async (ctx, { schoolId, grade, productId, quantity }) => {
		await requireElevated(ctx);
		if (!Number.isInteger(quantity) || quantity < 1) {
			throw new Error('Quantity must be a whole number ≥ 1.');
		}

		// Find or create the bundle (unique per school+grade).
		const existingBundle = await ctx.db
			.query('bundles')
			.withIndex('by_school_grade', (q) => q.eq('schoolId', schoolId).eq('grade', grade))
			.unique();
		const bundleId = existingBundle?._id ?? (await ctx.db.insert('bundles', { schoolId, grade }));

		// Upsert the line (one row per product).
		const existingItem = await ctx.db
			.query('bundleItems')
			.withIndex('by_bundle_product', (q) => q.eq('bundleId', bundleId).eq('productId', productId))
			.unique();
		if (existingItem) {
			await ctx.db.patch(existingItem._id, { quantity });
		} else {
			await ctx.db.insert('bundleItems', { bundleId, productId, quantity });
		}
	}
});

export const removeBundleItem = mutation({
	args: { itemId: v.id('bundleItems') },
	handler: async (ctx, { itemId }) => {
		await requireElevated(ctx);
		const item = await ctx.db.get(itemId);
		if (!item) return;
		await ctx.db.delete(itemId);

		const stillHasItems = await ctx.db
			.query('bundleItems')
			.withIndex('by_bundle', (q) => q.eq('bundleId', item.bundleId))
			.first();
		if (!stillHasItems) await ctx.db.delete(item.bundleId);
	}
});

export const deleteBundle = mutation({
	args: { bundleId: v.id('bundles') },
	handler: async (ctx, { bundleId }) => {
		await requireElevated(ctx);
		const items = await ctx.db
			.query('bundleItems')
			.withIndex('by_bundle', (q) => q.eq('bundleId', bundleId))
			.collect();
		await Promise.all(items.map((i) => ctx.db.delete(i._id)));
		await ctx.db.delete(bundleId);
	}
});

export const listBundleItems = query({
	args: { schoolId: v.id('schools'), grade: v.string() },
	handler: async (ctx, { schoolId, grade }) => {
		await requireElevated(ctx);
		const bundle = await ctx.db
			.query('bundles')
			.withIndex('by_school_grade', (q) => q.eq('schoolId', schoolId).eq('grade', grade))
			.unique();
		if (!bundle) return [];
		const items = await ctx.db
			.query('bundleItems')
			.withIndex('by_bundle', (q) => q.eq('bundleId', bundle._id))
			.collect();
		return Promise.all(items.map(async (i) => ({ ...i, product: await ctx.db.get(i.productId) })));
	}
});

// ─── Public: storefront reads ────────────────────────────────────────────────

// Backs /shop/[school]/[grade] — resolves the school by its slug, then the
// bundle by matching the grade's slug (grades aren't a fixed list, so match on
// slugify(grade) rather than storing a separate grade slug).
export const getBundleBySchoolAndGrade = query({
	args: { schoolSlug: v.string(), gradeSlug: v.string() },
	handler: async (ctx, { schoolSlug, gradeSlug }) => {
		const school = await ctx.db
			.query('schools')
			.withIndex('by_slug', (q) => q.eq('slug', schoolSlug))
			.first();
		if (!school) return null;

		const bundles = await ctx.db
			.query('bundles')
			.withIndex('by_school', (q) => q.eq('schoolId', school._id))
			.collect();
		const bundle = bundles.find((b) => slugify(b.grade) === gradeSlug);
		return bundle ? buildBundleDoc(ctx.db, bundle) : null;
	}
});

// By id — handy for internal links / admin previews.
export const getBundle = query({
	args: { bundleId: v.id('bundles') },
	handler: async (ctx, { bundleId }) => {
		const bundle = await ctx.db.get(bundleId);
		return bundle ? buildBundleDoc(ctx.db, bundle) : null;
	}
});

// Bundles offered by one school (grade + line count + link parts).
export const getSchoolBundles = query({
	args: { schoolId: v.id('schools') },
	handler: async (ctx, { schoolId }) => {
		const school = await ctx.db.get(schoolId);
		const bundles = await ctx.db
			.query('bundles')
			.withIndex('by_school', (q) => q.eq('schoolId', schoolId))
			.collect();
		return Promise.all(
			bundles.map(async (b) => {
				const items = await ctx.db
					.query('bundleItems')
					.withIndex('by_bundle', (q) => q.eq('bundleId', b._id))
					.collect();
				return {
					_id: b._id,
					grade: b.grade,
					gradeSlug: slugify(b.grade),
					schoolSlug: school?.slug ?? '',
					itemCount: items.length
				};
			})
		);
	}
});

// Schools that have at least one bundle, for a "shop by school" picker.
export const listSchoolsWithBundles = query({
	args: {},
	handler: async (ctx) => {
		const bundles = await ctx.db.query('bundles').collect();
		const schoolIds = [...new Set(bundles.map((b) => b.schoolId))];
		const schools = await Promise.all(schoolIds.map((id) => ctx.db.get(id)));
		return schools
			.filter((s): s is NonNullable<typeof s> => s !== null)
			.map((s) => ({ _id: s._id, name: s.name, slug: s.slug ?? '' }));
	}
});

// The full bundle catalog grouped by school — backs the /schools page. Schools
// without a slug are skipped (they can't be linked yet).
export const listBundleCatalog = query({
	args: {},
	handler: async (ctx) => {
		const bundles = await ctx.db.query('bundles').collect();

		const bySchool = new Map<string, Doc<'bundles'>[]>();
		for (const b of bundles) {
			const arr = bySchool.get(b.schoolId) ?? [];
			arr.push(b);
			bySchool.set(b.schoolId, arr);
		}

		const groups = await Promise.all(
			[...bySchool].map(async ([schoolId, schoolBundles]) => {
				const school = await ctx.db.get(schoolId as Doc<'bundles'>['schoolId']);
				if (!school?.slug) return null;
				const grades = schoolBundles
					.map((b) => ({ grade: b.grade, gradeSlug: slugify(b.grade) }))
					.sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));
				return { schoolName: school.name, schoolSlug: school.slug, grades };
			})
		);

		return groups
			.filter((g): g is NonNullable<typeof g> => g !== null)
			.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
	}
});
