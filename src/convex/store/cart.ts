// The cart. Signed-in carts live in `carts`; a guest's lines stay on their device and are priced by
// `getGuestCart`. A line is only a variant and a quantity: price, name and availability are read
// live, so a cart never holds a stale price. Reserving stock is checkout's job (step 5), not the
// cart's. Customer functions use requireCustomer and take no user argument.
import { v } from 'convex/values';
import { mutation, query } from '../_generated/server.js';
import type { Doc } from '../_generated/dataModel.js';
import type { MutationCtx, QueryCtx } from '../_generated/server.js';
import { requireCustomer } from '../model/store/access.js';
import { MAX_CART_LINES, mergeLines } from '../model/store/cart.js';
import {
	availability,
	loadActiveCategories,
	variantAvailability
} from '../model/store/publicProjection.js';

// Ids arrive as plain strings: a guest's saved ids may belong to another deployment or be gone.
const looseLine = v.object({
	variantId: v.string(),
	quantity: v.number(),
	fromSetId: v.optional(v.string())
});

const cartViewLine = v.object({
	variantId: v.id('productVariants'),
	quantity: v.number(),
	fromSetId: v.optional(v.id('schoolSets')),
	title: v.string(),
	slug: v.string(),
	categorySlug: v.string(),
	variantLabel: v.string(),
	imageUrl: v.union(v.string(), v.null()),
	/** Price of one, in paise, today */
	price: v.number(),
	availability
});

const cartView = v.object({
	lines: v.array(cartViewLine),
	/** Paise, lines that are in stock only. Shipping is added at checkout. */
	subtotal: v.number(),
	/** Copies in the cart (out-of-stock lines included) */
	count: v.number(),
	/** Set ids with their label, for grouping lines under "Class 1 books" and linking back to the set */
	sets: v.array(
		v.object({
			id: v.id('schoolSets'),
			label: v.string(),
			schoolName: v.string(),
			schoolSlug: v.string()
		})
	)
});

/** Keeps the lines that still exist and can be shown; ids are checked, quantities made sane. */
const priceLines = async (ctx: QueryCtx, input: (typeof looseLine.type)[]) => {
	const categories = await loadActiveCategories(ctx);
	const lines: (typeof cartViewLine.type)[] = [];
	for (const line of mergeLines(input.slice(0, MAX_CART_LINES * 2))) {
		const variantId = ctx.db.normalizeId('productVariants', line.variantId);
		const variant = variantId ? await ctx.db.get('productVariants', variantId) : null;
		const product = variant?.isActive ? await ctx.db.get('products', variant.productId) : null;
		const category = product ? categories.get(product.categoryId) : undefined;
		if (!variant || !product || !product.isActive || !category) continue;
		const state = variantAvailability(variant);
		const fromSetId = line.fromSetId ? ctx.db.normalizeId('schoolSets', line.fromSetId) : null;
		lines.push({
			variantId: variant._id,
			// Never more than the shelf holds, so the cart cannot promise what is not there
			quantity: state === 'out' ? line.quantity : Math.min(line.quantity, variant.stock),
			fromSetId: fromSetId ?? undefined,
			title: product.title,
			slug: product.slug,
			categorySlug: category.slug,
			variantLabel: variant.label,
			imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
			price: variant.price,
			availability: state
		});
	}
	const setIds = [...new Set(lines.flatMap((line) => (line.fromSetId ? [line.fromSetId] : [])))];
	const sets: (typeof cartView.type)['sets'] = [];
	for (const id of setIds) {
		const set: Doc<'schoolSets'> | null = await ctx.db.get('schoolSets', id);
		const school = set ? await ctx.db.get('schools', set.schoolId) : null;
		if (set && school) {
			sets.push({ id, label: set.label, schoolName: school.name, schoolSlug: school.slug });
		}
	}
	return {
		lines,
		subtotal: lines.reduce(
			(sum, line) => (line.availability === 'out' ? sum : sum + line.price * line.quantity),
			0
		),
		count: lines.reduce((sum, line) => sum + line.quantity, 0),
		sets
	};
};

const findCart = (ctx: QueryCtx, userId: string) =>
	ctx.db
		.query('carts')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.first();

/** Signed-in customer: their cart, priced today. Lines whose product was hidden are left out. */
export const getCart = query({
	args: {},
	returns: cartView,
	handler: async (ctx) => {
		const user = await requireCustomer(ctx);
		const cart = await findCart(ctx, user._id);
		return priceLines(ctx, cart?.lines ?? []);
	}
});

/** Deliberately public: prices the lines a guest keeps on their device. Nothing is stored. */
export const getGuestCart = query({
	args: { lines: v.array(looseLine) },
	returns: cartView,
	handler: async (ctx, args) => priceLines(ctx, args.lines)
});

/** Checks every line against the catalogue, then stores what survives (hidden products drop out). */
const writeCart = async (ctx: MutationCtx, userId: string, input: (typeof looseLine.type)[]) => {
	const priced = await priceLines(ctx, input);
	const lines = priced.lines.map(({ variantId, quantity, fromSetId }) => ({
		variantId,
		quantity,
		...(fromSetId ? { fromSetId } : {})
	}));
	const cart = await findCart(ctx, userId);
	if (cart) await ctx.db.patch('carts', cart._id, { lines, updatedAt: Date.now() });
	else await ctx.db.insert('carts', { userId, lines, updatedAt: Date.now() });
};

/** Replaces the signed-in cart with these lines (the client sends the whole list on every change). */
export const setLines = mutation({
	args: { lines: v.array(looseLine) },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		await writeCart(ctx, user._id, args.lines);
		return null;
	}
});

/** Sign-in: adds the guest's lines to the account cart. Quantities add up, within the caps. */
export const mergeGuest = mutation({
	args: { lines: v.array(looseLine) },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const cart = await findCart(ctx, user._id);
		await writeCart(ctx, user._id, mergeLines(cart?.lines ?? [], args.lines));
		return null;
	}
});
