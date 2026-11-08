// Checks for products and variants written by the admin (form and import). The rules live here so
// the form and the import can't accept different things.
import { ConvexError, v, type Infer } from 'convex/values';
import type { Id } from '../../_generated/dataModel.js';
import type { MutationCtx, QueryCtx } from '../../_generated/server.js';
import { gender, gstRate, productKind, uniformPart, uniformType } from '../../store/validators.js';
import { buildSearchText, slugify } from './catalog.js';
import { isClassOrder } from './classes.js';

export const productInput = v.object({
	title: v.string(),
	categoryId: v.id('categories'),
	kind: productKind,
	author: v.optional(v.string()),
	publisher: v.optional(v.string()),
	isbn: v.optional(v.string()),
	edition: v.optional(v.string()),
	subject: v.optional(v.string()),
	classFrom: v.optional(v.number()),
	classTo: v.optional(v.number()),
	schoolId: v.optional(v.id('schools')),
	gender: v.optional(gender),
	uniformType: v.optional(uniformType),
	part: v.optional(uniformPart),
	hsn: v.string(),
	gstRate,
	imageId: v.optional(v.id('_storage'))
});
export type ProductInput = Infer<typeof productInput>;

export const variantInput = v.object({
	label: v.string(),
	size: v.optional(v.string()),
	house: v.optional(v.string()),
	sku: v.optional(v.string()),
	mrp: v.number(),
	price: v.number(),
	purchasePrice: v.optional(v.number()),
	lowStockAt: v.number(),
	isActive: v.boolean()
});
export type VariantInput = Infer<typeof variantInput>;

export const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 120;

/** HSN codes are 4, 6 or 8 digits. */
export const isHsn = (value: string) => /^(\d{4}|\d{6}|\d{8})$/.test(value);

const clean = (value: string | undefined) => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
};

const isPaise = (value: number) => Number.isInteger(value) && value >= 0;

/** Price and MRP: whole paise, price above zero and not above the MRP. Shared with the import. */
export const priceError = (price: number, mrp: number): string | undefined => {
	if (!isPaise(price) || price === 0) return 'Price must be more than zero';
	if (!isPaise(mrp)) return 'MRP must be whole paise';
	if (price > mrp) return 'Price is above the MRP';
	return undefined;
};

/** A checked, trimmed product ready to write. Uniform fields are kept only on uniforms. */
export const checkProduct = async (ctx: QueryCtx, input: ProductInput) => {
	const title = input.title.trim();
	if (!title || title.length > MAX_TITLE_LENGTH) {
		throw new ConvexError(`A title is 1 to ${MAX_TITLE_LENGTH} characters`);
	}
	const hsn = input.hsn.trim();
	if (!isHsn(hsn)) throw new ConvexError('HSN is 4, 6 or 8 digits');
	if (!(await ctx.db.get('categories', input.categoryId))) {
		throw new ConvexError('Category not found');
	}
	const texts = {
		author: clean(input.author),
		publisher: clean(input.publisher),
		isbn: clean(input.isbn)?.replace(/[\s-]/g, ''),
		edition: clean(input.edition),
		subject: clean(input.subject)
	};
	for (const value of Object.values(texts)) {
		if (value && value.length > MAX_TEXT_LENGTH) {
			throw new ConvexError(`Keep each detail under ${MAX_TEXT_LENGTH} characters`);
		}
	}
	const { classFrom, classTo } = input;
	if ((classFrom === undefined) !== (classTo === undefined)) {
		throw new ConvexError('Give both ends of the class range, or neither');
	}
	if (classFrom !== undefined && classTo !== undefined) {
		if (!isClassOrder(classFrom) || !isClassOrder(classTo) || classFrom > classTo) {
			throw new ConvexError('The class range is not valid');
		}
	}
	const uniform =
		input.kind === 'uniform'
			? {
					schoolId: input.schoolId,
					gender: input.gender,
					uniformType: input.uniformType,
					part: input.part
				}
			: {};
	if (input.kind === 'uniform') {
		if (!input.schoolId || !input.gender || !input.uniformType || !input.part) {
			throw new ConvexError('A uniform item needs its school, gender, type and part');
		}
		if (!(await ctx.db.get('schools', input.schoolId))) throw new ConvexError('School not found');
	}
	return {
		title,
		categoryId: input.categoryId,
		kind: input.kind,
		...texts,
		classFrom,
		classTo,
		...uniform,
		hsn,
		gstRate: input.gstRate,
		imageId: input.imageId,
		searchText: buildSearchText({ title, ...texts })
	};
};

/** A checked, trimmed variant. The SKU must not belong to another variant. */
export const checkVariant = async (
	ctx: QueryCtx,
	input: VariantInput,
	selfId?: Id<'productVariants'>
) => {
	const label = input.label.trim();
	if (!label || label.length > 60) throw new ConvexError('A size label is 1 to 60 characters');
	const error = priceError(input.price, input.mrp);
	if (error) throw new ConvexError(error);
	if (input.purchasePrice !== undefined && !isPaise(input.purchasePrice)) {
		throw new ConvexError('Purchase price must be whole paise');
	}
	if (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 0) {
		throw new ConvexError('The low-stock level is a whole number, zero or more');
	}
	const sku = clean(input.sku);
	if (sku) {
		const owners = await ctx.db
			.query('productVariants')
			.withIndex('by_sku', (q) => q.eq('sku', sku))
			.take(2);
		if (owners.some((owner) => owner._id !== selfId)) {
			throw new ConvexError(`Item code ${sku} is already used by another product`);
		}
	}
	return {
		label,
		size: clean(input.size),
		house: clean(input.house),
		sku,
		mrp: input.mrp,
		price: input.price,
		purchasePrice: input.purchasePrice,
		lowStockAt: input.lowStockAt,
		isActive: input.isActive
	};
};

/** A slug no other product has, from the title. Set once at insert; never changed. */
export const uniqueProductSlug = async (ctx: MutationCtx, title: string) => {
	const base = slugify(title);
	for (let n = 1; n <= 200; n += 1) {
		const slug = n === 1 ? base : `${base}-${n}`;
		const taken = await ctx.db
			.query('products')
			.withIndex('by_slug', (q) => q.eq('slug', slug))
			.first();
		if (!taken) return slug;
	}
	throw new ConvexError('Too many products share this title');
};

/** The next sort position for a new variant of a product. */
export const nextVariantSort = async (ctx: QueryCtx, productId: Id<'products'>) => {
	const last = await ctx.db
		.query('productVariants')
		.withIndex('by_productId_and_sortOrder', (q) => q.eq('productId', productId))
		.order('desc')
		.first();
	return (last?.sortOrder ?? 0) + 1;
};
