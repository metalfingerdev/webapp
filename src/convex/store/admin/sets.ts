// Admin: a school's sets per session and their lines. Every function calls requireAppAdmin first.
// Orders snapshot their lines, so nothing here changes a past order.
import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel.js';
import { mutation, query, type MutationCtx, type QueryCtx } from '../../_generated/server.js';
import { requireAppAdmin } from '../../model/store/access.js';
import { isClassOrder } from '../../model/store/classes.js';
import { currentSession } from '../../model/store/schools.js';
import {
	checkLine,
	lineKindError,
	loadSchoolSets,
	loadSetLines,
	MAX_SET_LINES,
	MAX_SET_QUANTITY,
	MAX_SETS,
	publishError,
	shiftSession
} from '../../model/store/setRules.js';
import { gender, isSession, session, setType, uniformType } from '../validators.js';

const setFields = {
	label: v.string(),
	classFrom: v.number(),
	classTo: v.number(),
	gender: v.optional(gender),
	uniformType: v.optional(uniformType)
};

const loadSet = async (ctx: QueryCtx, setId: Id<'schoolSets'>) => {
	const set = await ctx.db.get('schoolSets', setId);
	if (!set) throw new ConvexError('Set not found');
	return set;
};

/** Checked set fields; a label is unique within its school and session. */
const checkSet = async (
	ctx: QueryCtx,
	set: { schoolId: Id<'schools'>; session: string; type: Doc<'schoolSets'>['type'] },
	args: {
		label: string;
		classFrom: number;
		classTo: number;
		gender?: Doc<'schoolSets'>['gender'];
		uniformType?: Doc<'schoolSets'>['uniformType'];
	},
	selfId?: Id<'schoolSets'>
) => {
	const label = args.label.trim();
	if (!label || label.length > 80) throw new ConvexError('A set name is 1 to 80 characters');
	if (
		!isClassOrder(args.classFrom) ||
		!isClassOrder(args.classTo) ||
		args.classFrom > args.classTo
	) {
		throw new ConvexError('The class range is not valid');
	}
	if (set.type === 'uniform' && (!args.gender || !args.uniformType)) {
		throw new ConvexError('A uniform set needs its gender and uniform type');
	}
	const same = await ctx.db
		.query('schoolSets')
		.withIndex('by_schoolId_and_label_and_session', (q) =>
			q.eq('schoolId', set.schoolId).eq('label', label).eq('session', set.session)
		)
		.take(2);
	if (same.some((other) => other._id !== selfId)) {
		throw new ConvexError(`There is already a set called "${label}" in ${set.session}`);
	}
	return {
		label,
		classFrom: args.classFrom,
		classTo: args.classTo,
		gender: set.type === 'uniform' ? args.gender : undefined,
		uniformType: set.type === 'uniform' ? args.uniformType : undefined
	};
};

/** The sessions the admin can work on: last, current (from settings) and next. */
export const sessions = query({
	args: {},
	handler: async (ctx) => {
		await requireAppAdmin(ctx);
		const current = await currentSession(ctx);
		return { current, all: [shiftSession(current, -1), current, shiftSession(current, 1)] };
	}
});

/** A school's sets in one session, each with what would stop it from being published. */
export const listForSchool = query({
	args: { schoolId: v.id('schools'), session },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const rows = [];
		for (const set of await loadSchoolSets(ctx, args.schoolId, args.session)) {
			const checks = [];
			for (const line of await loadSetLines(ctx, set._id)) checks.push(await checkLine(ctx, line));
			rows.push({
				...set,
				lines: checks.length,
				hidden: checks.filter((check) => check.hidden).length,
				outOfStock: checks.filter((check) => check.outOfStock).length,
				problem: publishError(checks) ?? null
			});
		}
		return rows;
	}
});

/** One set with its lines as the admin sees them: exact stock, hidden things flagged. */
export const get = query({
	args: { setId: v.id('schoolSets') },
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const set = await ctx.db.get('schoolSets', args.setId);
		if (!set) return null;
		const school = await ctx.db.get('schools', set.schoolId);
		const lines = [];
		const checks = [];
		for (const line of await loadSetLines(ctx, set._id)) {
			const check = await checkLine(ctx, line);
			checks.push(check);
			lines.push({
				_id: line._id,
				quantity: line.quantity,
				productId: line.productId,
				title: check.product?.title ?? '',
				kind: check.product?.kind ?? null,
				size: check.variant?.label ?? null,
				price: check.variant?.price ?? null,
				stock: check.variant?.stock ?? null,
				hidden: check.hidden,
				outOfStock: check.outOfStock
			});
		}
		return {
			...set,
			schoolName: school?.name ?? '',
			lines,
			problem: publishError(checks) ?? null
		};
	}
});

/** Adds a set, hidden until it is published. */
export const create = mutation({
	args: { schoolId: v.id('schools'), session, type: setType, ...setFields },
	returns: v.id('schoolSets'),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		if (!(await ctx.db.get('schools', args.schoolId))) throw new ConvexError('School not found');
		if (!isSession(args.session)) throw new ConvexError('A session looks like 2026-27');
		const existing = await loadSchoolSets(ctx, args.schoolId, args.session);
		if (existing.length >= MAX_SETS) throw new ConvexError('This school has too many sets');
		const fields = await checkSet(ctx, args, args);
		return await ctx.db.insert('schoolSets', {
			schoolId: args.schoolId,
			session: args.session,
			type: args.type,
			...fields,
			sortOrder: Math.max(0, ...existing.map((set) => set.sortOrder)) + 1,
			isActive: false
		});
	}
});

/** Edits a set's name, classes and, for uniforms, gender and type. Its type never changes. */
export const update = mutation({
	args: { setId: v.id('schoolSets'), ...setFields },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const set = await loadSet(ctx, args.setId);
		const fields = await checkSet(ctx, set, args, set._id);
		await ctx.db.replace('schoolSets', set._id, {
			schoolId: set.schoolId,
			session: set.session,
			type: set.type,
			sortOrder: set.sortOrder,
			isActive: set.isActive,
			...fields
		});
		return null;
	}
});

/** Publishes or hides a set. Publishing is refused while it is empty or has hidden lines. */
export const setActive = mutation({
	args: { setId: v.id('schoolSets'), isActive: v.boolean() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const set = await loadSet(ctx, args.setId);
		if (args.isActive) {
			const checks = [];
			for (const line of await loadSetLines(ctx, set._id)) checks.push(await checkLine(ctx, line));
			const problem = publishError(checks);
			if (problem) throw new ConvexError(problem);
		}
		await ctx.db.patch('schoolSets', set._id, { isActive: args.isActive });
		return null;
	}
});

const checkQuantity = (quantity: number) => {
	if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_SET_QUANTITY) {
		throw new ConvexError(`Quantity is 1 to ${MAX_SET_QUANTITY}`);
	}
};

/**
 * Adds a product to a set. A book or stationery line names one size (a product with a single size
 * needs none given); a uniform line names none, because the parent picks the size.
 */
export const addLine = mutation({
	args: {
		setId: v.id('schoolSets'),
		productId: v.id('products'),
		variantId: v.optional(v.id('productVariants')),
		quantity: v.number()
	},
	returns: v.id('setItems'),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		checkQuantity(args.quantity);
		const set = await loadSet(ctx, args.setId);
		const product = await ctx.db.get('products', args.productId);
		if (!product) throw new ConvexError('Product not found');
		const kindError = lineKindError(set, product);
		if (kindError) throw new ConvexError(kindError);

		let variantId: Id<'productVariants'> | undefined;
		if (set.type === 'books') {
			if (args.variantId) {
				const variant = await ctx.db.get('productVariants', args.variantId);
				if (!variant || variant.productId !== product._id) {
					throw new ConvexError('That size is not one of this product’s');
				}
				variantId = variant._id;
			} else {
				const sizes = await ctx.db
					.query('productVariants')
					.withIndex('by_productId_and_sortOrder', (q) => q.eq('productId', product._id))
					.take(2);
				if (sizes.length !== 1) throw new ConvexError('Pick which size goes in the set');
				variantId = sizes[0]._id;
			}
		} else if (args.variantId) {
			throw new ConvexError('A uniform line has no size: the parent picks it');
		}

		const lines = await loadSetLines(ctx, set._id);
		if (lines.length >= MAX_SET_LINES) throw new ConvexError('This set has too many lines');
		if (lines.some((line) => line.productId === product._id && line.variantId === variantId)) {
			throw new ConvexError('This product is already in the set');
		}
		return await ctx.db.insert('setItems', {
			setId: set._id,
			productId: product._id,
			variantId,
			quantity: args.quantity,
			// Every line can be unticked by the parent (store-profile.md, 2026-11-07)
			isOptional: true,
			sortOrder: Math.max(0, ...lines.map((line) => line.sortOrder)) + 1
		});
	}
});

const loadLine = async (ctx: QueryCtx, lineId: Id<'setItems'>) => {
	const line = await ctx.db.get('setItems', lineId);
	if (!line) throw new ConvexError('Line not found');
	return line;
};

export const updateLine = mutation({
	args: { lineId: v.id('setItems'), quantity: v.number() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		checkQuantity(args.quantity);
		const line = await loadLine(ctx, args.lineId);
		await ctx.db.patch('setItems', line._id, { quantity: args.quantity });
		return null;
	}
});

export const moveLine = mutation({
	args: { lineId: v.id('setItems'), direction: v.union(v.literal('up'), v.literal('down')) },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const line = await loadLine(ctx, args.lineId);
		const neighbour =
			args.direction === 'up'
				? await ctx.db
						.query('setItems')
						.withIndex('by_setId_and_sortOrder', (q) =>
							q.eq('setId', line.setId).lt('sortOrder', line.sortOrder)
						)
						.order('desc')
						.first()
				: await ctx.db
						.query('setItems')
						.withIndex('by_setId_and_sortOrder', (q) =>
							q.eq('setId', line.setId).gt('sortOrder', line.sortOrder)
						)
						.first();
		if (!neighbour) return null;
		await ctx.db.patch('setItems', line._id, { sortOrder: neighbour.sortOrder });
		await ctx.db.patch('setItems', neighbour._id, { sortOrder: line.sortOrder });
		return null;
	}
});

/** Removes a line. Past orders keep their own copy of it. */
export const removeLine = mutation({
	args: { lineId: v.id('setItems') },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		const line = await loadLine(ctx, args.lineId);
		await ctx.db.delete('setItems', line._id);
		return null;
	}
});

const copySet = async (ctx: MutationCtx, set: Doc<'schoolSets'>, to: string) => {
	const { _id, _creationTime, ...fields } = set;
	void _creationTime;
	const copyId = await ctx.db.insert('schoolSets', { ...fields, session: to, isActive: false });
	for (const line of await loadSetLines(ctx, _id)) {
		await ctx.db.insert('setItems', {
			setId: copyId,
			productId: line.productId,
			variantId: line.variantId,
			quantity: line.quantity,
			isOptional: line.isOptional,
			sortOrder: line.sortOrder
		});
	}
};

/**
 * Copies a school's sets and their lines from one session into another, hidden, to be edited and
 * published there. Refused when the target session already has sets for the school, so a copy
 * never mixes with work already done. The source session is not changed.
 */
export const copyToSession = mutation({
	args: { schoolId: v.id('schools'), from: session, to: session },
	returns: v.number(),
	handler: async (ctx, args) => {
		await requireAppAdmin(ctx);
		if (!isSession(args.from) || !isSession(args.to) || args.from === args.to) {
			throw new ConvexError('Pick two different sessions');
		}
		if ((await loadSchoolSets(ctx, args.schoolId, args.to)).length > 0) {
			throw new ConvexError(`${args.to} already has sets for this school`);
		}
		const sets = await loadSchoolSets(ctx, args.schoolId, args.from);
		if (sets.length === 0) throw new ConvexError(`${args.from} has no sets to copy`);
		for (const set of sets) await copySet(ctx, set, args.to);
		return sets.length;
	}
});
