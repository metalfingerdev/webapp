// Rules for editing school sets in the admin (admin.md → Schools and sets): what a set's lines may
// hold, when a set may be published, and how sessions follow each other.
import type { Doc, Id } from '../../_generated/dataModel.js';
import type { QueryCtx } from '../../_generated/server.js';
import { isSession } from '../../store/validators.js';

/** Sets per school and session, and lines per set: the same bounds the shop reads with. */
export const MAX_SETS = 100;
export const MAX_SET_LINES = 100;
/** Copies of one book in a set */
export const MAX_SET_QUANTITY = 10;

/** "2026-27" moved by `years`: shiftSession("2026-27", 1) is "2027-28". */
export const shiftSession = (session: string, years: number) => {
	if (!isSession(session)) return session;
	const start = Number(session.slice(0, 4)) + years;
	return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

export const loadSetLines = (ctx: QueryCtx, setId: Id<'schoolSets'>) =>
	ctx.db
		.query('setItems')
		.withIndex('by_setId_and_sortOrder', (q) => q.eq('setId', setId))
		.take(MAX_SET_LINES);

export const loadSchoolSets = (ctx: QueryCtx, schoolId: Id<'schools'>, session: string) =>
	ctx.db
		.query('schoolSets')
		.withIndex('by_schoolId_and_session_and_sortOrder', (q) =>
			q.eq('schoolId', schoolId).eq('session', session)
		)
		.take(MAX_SETS);

/** Why this product can't be a line of this set, or undefined when it can. */
export const lineKindError = (set: Doc<'schoolSets'>, product: Doc<'products'>) => {
	if (set.type === 'books' && product.kind === 'uniform') {
		return 'A book set takes books and stationery, not uniform pieces';
	}
	if (set.type === 'uniform' && product.kind !== 'uniform') {
		return 'A uniform set takes uniform pieces only';
	}
	if (set.type === 'uniform' && product.schoolId !== set.schoolId) {
		return 'This uniform piece belongs to another school';
	}
	return undefined;
};

export type LineCheck = {
	product: Doc<'products'> | null;
	variant: Doc<'productVariants'> | null;
	/** Hidden product or size, or a uniform piece with no size on sale: customers won't see it */
	hidden: boolean;
	outOfStock: boolean;
};

/** What customers would see of one line: the same rules as the shop's set page. */
export const checkLine = async (ctx: QueryCtx, line: Doc<'setItems'>): Promise<LineCheck> => {
	const product = await ctx.db.get('products', line.productId);
	const category = product ? await ctx.db.get('categories', product.categoryId) : null;
	if (line.variantId) {
		const variant = await ctx.db.get('productVariants', line.variantId);
		const hidden = !product?.isActive || !category?.isActive || !variant?.isActive;
		return { product, variant, hidden, outOfStock: !hidden && variant!.stock <= 0 };
	}
	const sizes = product
		? (
				await ctx.db
					.query('productVariants')
					.withIndex('by_productId_and_sortOrder', (q) => q.eq('productId', product._id))
					.take(50)
			).filter((variant) => variant.isActive)
		: [];
	const hidden = !product?.isActive || !category?.isActive || sizes.length === 0;
	return {
		product,
		variant: null,
		hidden,
		outOfStock: !hidden && sizes.every((variant) => variant.stock <= 0)
	};
};

/** Why a set may not be published, or undefined when it may. A set never goes live half-empty. */
export const publishError = (checks: LineCheck[]) => {
	if (checks.length === 0) return 'This set has no lines yet';
	const hidden = checks.filter((check) => check.hidden).length;
	if (hidden) {
		return `${hidden} ${hidden === 1 ? 'line is' : 'lines are'} hidden from customers; fix or remove ${hidden === 1 ? 'it' : 'them'} first`;
	}
	return undefined;
};
