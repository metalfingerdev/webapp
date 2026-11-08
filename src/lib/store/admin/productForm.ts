// Form state for the admin product screens: strings while editing, converted to the Convex
// argument shapes on save. The server checks everything again (model/store/products.ts).
import type { Doc, Id } from '#convex/_generated/dataModel.js';
import type { GstRate } from '#convex/store/validators.js';
import { strings } from '#lib/store/strings.js';
import { parseRupees, toRupeeInput } from './money.js';

const errors = strings.admin.sizes.errors;

export type ProductState = {
	title: string;
	categoryId: string;
	kind: 'book' | 'uniform' | 'stationery';
	author: string;
	publisher: string;
	isbn: string;
	edition: string;
	subject: string;
	classFrom: string;
	classTo: string;
	schoolId: string;
	gender: string;
	uniformType: string;
	part: string;
	hsn: string;
	gstRate: string;
	imageId?: Id<'_storage'>;
	imageUrl?: string | null;
};

export type VariantState = {
	label: string;
	size: string;
	house: string;
	sku: string;
	mrp: string;
	price: string;
	purchasePrice: string;
	lowStockAt: string;
	isActive: boolean;
};

export const GST_RATES = ['0', '500', '1200', '1800', '2800', 'exempt'] as const;

export const emptyProduct = (): ProductState => ({
	title: '',
	categoryId: '',
	kind: 'book',
	author: '',
	publisher: '',
	isbn: '',
	edition: '',
	subject: '',
	classFrom: '',
	classTo: '',
	schoolId: '',
	gender: '',
	uniformType: '',
	part: '',
	hsn: '',
	// No default rate: the admin picks one, so a wrong rate is never saved by leaving it alone
	gstRate: ''
});

export const productState = (p: Doc<'products'> & { imageUrl: string | null }): ProductState => ({
	title: p.title,
	categoryId: p.categoryId,
	kind: p.kind,
	author: p.author ?? '',
	publisher: p.publisher ?? '',
	isbn: p.isbn ?? '',
	edition: p.edition ?? '',
	subject: p.subject ?? '',
	classFrom: p.classFrom === undefined ? '' : String(p.classFrom),
	classTo: p.classTo === undefined ? '' : String(p.classTo),
	schoolId: p.schoolId ?? '',
	gender: p.gender ?? '',
	uniformType: p.uniformType ?? '',
	part: p.part ?? '',
	hsn: p.hsn,
	gstRate: String(p.gstRate),
	imageId: p.imageId,
	imageUrl: p.imageUrl
});

export const emptyVariant = (): VariantState => ({
	label: 'Default',
	size: '',
	house: '',
	sku: '',
	mrp: '',
	price: '',
	purchasePrice: '',
	lowStockAt: '2',
	isActive: true
});

export const variantState = (v: Doc<'productVariants'>): VariantState => ({
	label: v.label,
	size: v.size ?? '',
	house: v.house ?? '',
	sku: v.sku ?? '',
	mrp: toRupeeInput(v.mrp),
	price: toRupeeInput(v.price),
	purchasePrice: toRupeeInput(v.purchasePrice),
	lowStockAt: String(v.lowStockAt),
	isActive: v.isActive
});

const optional = (text: string) => (text.trim() ? text.trim() : undefined);

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const toProductInput = (s: ProductState) => {
	if (!s.categoryId) return { ok: false, error: errors.category } as const;
	if (!s.gstRate) return { ok: false, error: errors.gstRate } as const;
	const uniform = s.kind === 'uniform';
	const gstRate: GstRate = s.gstRate === 'exempt' ? 'exempt' : (Number(s.gstRate) as GstRate);
	return {
		ok: true,
		value: {
			title: s.title,
			categoryId: s.categoryId as Id<'categories'>,
			kind: s.kind,
			author: optional(s.author),
			publisher: optional(s.publisher),
			isbn: optional(s.isbn),
			edition: optional(s.edition),
			subject: optional(s.subject),
			classFrom: s.classFrom === '' ? undefined : Number(s.classFrom),
			classTo: s.classTo === '' ? undefined : Number(s.classTo),
			schoolId: uniform && s.schoolId ? (s.schoolId as Id<'schools'>) : undefined,
			gender: uniform && s.gender ? (s.gender as 'boys' | 'girls' | 'unisex') : undefined,
			uniformType:
				uniform && s.uniformType ? (s.uniformType as 'regular' | 'sports' | 'winter') : undefined,
			part: uniform && s.part ? (s.part as 'top' | 'bottom' | 'accessory' | 'footwear') : undefined,
			hsn: s.hsn,
			gstRate,
			imageId: s.imageId
		}
	} as const;
};

export const toVariantInput = (
	s: VariantState
): Result<{
	label: string;
	size?: string;
	house?: string;
	sku?: string;
	mrp: number;
	price: number;
	purchasePrice?: number;
	lowStockAt: number;
	isActive: boolean;
}> => {
	const price = parseRupees(s.price);
	if (price === undefined || price === null) return { ok: false, error: errors.price };
	const mrp = parseRupees(s.mrp);
	if (mrp === null) return { ok: false, error: errors.mrp };
	const purchasePrice = parseRupees(s.purchasePrice);
	if (purchasePrice === null) return { ok: false, error: errors.purchasePrice };
	const lowStockAt = Number(s.lowStockAt);
	if (!Number.isInteger(lowStockAt) || lowStockAt < 0) {
		return { ok: false, error: errors.lowStockAt };
	}
	return {
		ok: true,
		value: {
			label: s.label,
			size: optional(s.size),
			house: optional(s.house),
			sku: optional(s.sku),
			// A blank MRP means the price is the MRP
			mrp: mrp ?? price,
			price,
			purchasePrice,
			lowStockAt,
			isActive: s.isActive
		}
	};
};
