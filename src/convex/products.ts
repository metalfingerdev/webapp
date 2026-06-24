// convex/products.ts
import { query, mutation } from './_generated/server.js';
import { paginationOptsValidator } from 'convex/server';
import { TAX_CATEGORY } from './schema.js';
import { v } from 'convex/values';

export const bulkImport = mutation({
	args: {
		products: v.array(
			v.object({
				name: v.string(),
				salePrice: v.number(),
				stock: v.number(),
				weight: v.number(),
				category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')),
				hsnCode: v.optional(v.string()),
				maxRetailPrice: v.optional(v.number()),
				purchasePrice: v.optional(v.number()),
				barcode: v.optional(v.string()),
				unit: v.optional(v.string()),
				taxCategory: v.optional(TAX_CATEGORY),
				details: v.union(
					v.object({ type: v.literal('book'), author: v.string(), subject: v.string() }),
					v.object({
						type: v.literal('clothes'),
						gender: v.string(),
						size: v.string(),
						variant: v.union(v.literal('sports'), v.literal('white'))
					}),
					v.object({ type: v.literal('stationary'), itemType: v.string() })
				)
			})
		)
	},
	handler: async (ctx, { products }) => {
		let imported = 0;
		let skipped = 0;
		for (const p of products) {
			if (!p.name) {
				skipped++;
				continue;
			}
			
			if (p.barcode) {
				const existing = await ctx.db
					.query('products')
					.withIndex('by_barcode', (q) => q.eq('barcode', p.barcode!))
					.unique();
				if (existing) {
					await ctx.db.patch(existing._id, p);
					imported++;
					continue;
				}
			}
			await ctx.db.insert('products', p);
			imported++;
		}
		return { imported, skipped };
	}
});

export const getProducts = query({
	args: {
		paginationOpts: paginationOptsValidator,
		category: v.optional(v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')))
	},
	handler: async (ctx, args) => {
		const q = ctx.db.query('products');

		if (args.category) {
			return await q
				.withIndex('by_category', (q) => q.eq('category', args.category!))
				.paginate(args.paginationOpts);
		}

		return await q.order('desc').paginate(args.paginationOpts);
	}
});

export const getProductById = query({
	// Use v.id('products') instead of v.string()
	args: { id: v.id('products') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const getSchoolProducts = query({
	args: {
		paginationOpts: paginationOptsValidator,
		schoolId: v.id('schools'),
		grade: v.string(),
		category: v.optional(v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary')))
	},
	handler: async (ctx, args) => {
		const bundlePage = await ctx.db
			.query('bundles')
			.withIndex('by_school_grade', (q) => q.eq('schoolId', args.schoolId).eq('grade', args.grade))
			.paginate(args.paginationOpts);

		const products = await Promise.all(bundlePage.page.map((b) => ctx.db.get(b.productId)));

		return {
			...bundlePage,
			page: products
				.filter((p): p is NonNullable<typeof p> => p !== null)
				.filter((p) => !args.category || p.category === args.category)
		};
	}
});

export const getProductsThatAre = query({
	args: {
		paginationOpts: paginationOptsValidator,
		category: v.union(v.literal('book'), v.literal('clothes'), v.literal('stationary'))
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('products')
			.withIndex('by_category', (q) => q.eq('category', args.category))
			.paginate(args.paginationOpts);
	}
});

export const deleteProduct = mutation({
	args: { id: v.id('products') },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	}
});

export const validateCartStock = mutation({
	args: {
		items: v.array(
			v.object({
				id: v.id('products'),
				name: v.string(),
				quantity: v.number()
			})
		)
	},
	handler: async (ctx, args) => {
		for (const item of args.items) {
			const product = await ctx.db.get(item.id);

			if (!product) {
				throw new Error(`The product "${item.name}" is no longer available.`);
			}

			if (product.stock < item.quantity) {
				throw new Error(
					`Insufficient stock for "${item.name}". You requested ${item.quantity}, but only ${product.stock} are left.`
				);
			}
		}
	}
});
