// Demo data for a dev deployment: `npx convex run store/seed:run`. Everything here is made up
// (titles, prices, sizes); the school names are the client's partner schools from the live site.
// Never put real customer data or the shop's contact details here. Runs once: it stops if any
// school exists.
import { v } from 'convex/values';
import { internalMutation, type MutationCtx } from '../_generated/server.js';
import type { Id } from '../_generated/dataModel.js';
import { buildSearchText, reserveUniqueSlug, slugify } from '../model/store/catalog.js';
import { adjustStock } from '../model/store/stock.js';
import { PLACEHOLDER_CLASS_BANDS as BANDS } from '../model/store/classes.js';
import {
	PLACEHOLDER_FREE_SHIPPING_FROM,
	PLACEHOLDER_RETURN_WINDOW_DAYS,
	PLACEHOLDER_SESSION,
	PLACEHOLDER_SHIPPING_FEE,
	STORE_NAME
} from '../model/store/storeProfile.js';
import type { Gender, GstRate, ProductKind, UniformType } from './validators.js';

const SCHOOLS = [
	'Ryan International School',
	'Vidya Mandir Public School',
	'Manaskriti School',
	'AVN Senior Secondary School',
	'Adarsh Vidya Niketan High School',
	'Bhatnagar International Foundation School'
];

/** Demo only. Real HSN codes and GST rates come from the client's CA (store-profile.md). */
const DEMO_HSN = '0000';
const DEMO_GST: GstRate = 0;

const rupees = (r: number) => r * 100;

type VariantSeed = { label: string; size?: string; house?: string; price: number; stock: number };

export const run = internalMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		if (await ctx.db.query('schools').first()) return 'Already seeded: a school exists.';

		const slugs = new Set<string>();

		// Settings: placeholders until the owner types the real values into /admin/settings.
		await ctx.db.insert('storeSettings', {
			businessName: STORE_NAME,
			shippingFee: PLACEHOLDER_SHIPPING_FEE,
			freeShippingFrom: PLACEHOLDER_FREE_SHIPPING_FROM,
			returnWindowDays: PLACEHOLDER_RETURN_WINDOW_DAYS,
			currentSession: PLACEHOLDER_SESSION,
			placedOrdersOpen: true
		});

		// Categories
		const category = async (name: string, sortOrder: number, parentId?: Id<'categories'>) =>
			ctx.db.insert('categories', {
				name,
				slug: slugify(name),
				parentId,
				sortOrder,
				isActive: true
			});
		const books = await category('Books', 1);
		const textbooks = await category('Textbooks', 1, books);
		await category('NCERT Books', 2, books);
		await category('Sample Papers', 3, books);
		await category('Entrance Exam Books', 4, books);
		await category('Language Books', 5, books);
		const uniforms = await category('Uniforms', 2);
		const stationery = await category('Stationery', 3);

		// Schools
		const schoolIds: Id<'schools'>[] = [];
		for (const [i, name] of SCHOOLS.entries()) {
			schoolIds.push(
				await ctx.db.insert('schools', {
					name,
					slug: reserveUniqueSlug(slugify(name), slugs),
					isActive: true,
					sortOrder: i + 1
				})
			);
		}
		const demoSchool = schoolIds[0];

		const product = (
			title: string,
			kind: ProductKind,
			categoryId: Id<'categories'>,
			variants: VariantSeed[],
			extra: {
				author?: string;
				publisher?: string;
				subject?: string;
				classFrom?: number;
				classTo?: number;
				schoolId?: Id<'schools'>;
				gender?: Gender;
				uniformType?: UniformType;
				part?: 'top' | 'bottom' | 'accessory' | 'footwear';
			} = {}
		) => insertProduct(ctx, slugs, { title, kind, categoryId, ...extra }, variants);

		const one = (price: number, stock = 40): VariantSeed[] => [
			{ label: 'Default', price: rupees(price), stock }
		];
		/** Sizes whose price rises by `step` rupees per size. */
		const sized = (sizes: string[], from: number, step: number): VariantSeed[] =>
			sizes.map((size, i) => ({ label: size, size, price: rupees(from + i * step), stock: 15 }));

		// Books: Class 1 and Class 2 textbooks, plus a few general titles.
		const subjects = [
			'English',
			'Hindi',
			'Mathematics',
			'Environmental Studies',
			'General Knowledge'
		];
		const class1Books: Id<'productVariants'>[] = [];
		for (const classOrder of [1, 2]) {
			for (const [i, subject] of subjects.entries()) {
				const { variantIds } = await product(
					`Demo ${subject} Reader, Class ${classOrder}`,
					'book',
					textbooks,
					one(180 + i * 35),
					{ publisher: 'Demo Publisher', subject, classFrom: classOrder, classTo: classOrder }
				);
				if (classOrder === 1) class1Books.push(variantIds[0]);
			}
		}
		for (const [i, title] of [
			'Demo Science Workbook, Class 6',
			'Demo Mathematics Practice, Class 7',
			'Demo Sample Papers, Class 10',
			'Demo Sample Papers, Class 12',
			'Demo Entrance Exam Guide',
			'Demo Sanskrit Primer',
			'Demo French for Beginners',
			'Demo English Grammar',
			'Demo Atlas',
			'Demo Hindi Vyakaran'
		].entries()) {
			await product(title, 'book', textbooks, one(220 + i * 40), {
				author: 'Demo Author',
				publisher: 'Demo Publisher'
			});
		}

		// Stationery
		const stationeryIds: Id<'productVariants'>[] = [];
		for (const [title, price] of [
			['Demo Ruled Notebook, 172 pages', 45],
			['Demo Pencil Box', 120],
			['Demo Geometry Box', 150],
			['Demo Crayons, 24 colours', 90],
			['Demo Water Bottle', 199],
			['Demo School Bag', 899]
		] as const) {
			const { variantIds } = await product(title, 'stationery', stationery, one(price, 60));
			stationeryIds.push(variantIds[0]);
		}

		// Uniforms for the demo school.
		const shirtSizes = ['22', '24', '26', '28', '30', '32', '34', '36'];
		const bottomSizes = ['20', '22', '24', '26', '28', '30', '32', '34'];
		const forSchool = { schoolId: demoSchool };
		const regular = { ...forSchool, uniformType: 'regular' as const };
		const all = { classFrom: BANDS.prePrimary.from, classTo: BANDS.senior.to };
		const primary = { classFrom: BANDS.prePrimary.from, classTo: BANDS.primary.to };
		const senior = { classFrom: BANDS.senior.from, classTo: BANDS.senior.to };

		const boysShirt = await product(
			'Demo Boys Shirt',
			'uniform',
			uniforms,
			sized(shirtSizes, 350, 25),
			{
				...regular,
				...all,
				gender: 'boys',
				part: 'top'
			}
		);
		const boysShorts = await product(
			'Demo Boys Shorts',
			'uniform',
			uniforms,
			sized(bottomSizes.slice(0, 5), 300, 20),
			{
				...regular,
				...primary,
				gender: 'boys',
				part: 'bottom'
			}
		);
		await product('Demo Boys Trousers', 'uniform', uniforms, sized(bottomSizes.slice(3), 450, 30), {
			...regular,
			...senior,
			gender: 'boys',
			part: 'bottom'
		});
		await product('Demo Girls Shirt', 'uniform', uniforms, sized(shirtSizes, 350, 25), {
			...regular,
			...all,
			gender: 'girls',
			part: 'top'
		});
		await product(
			'Demo Girls Skirt, Primary',
			'uniform',
			uniforms,
			sized(bottomSizes.slice(0, 5), 320, 20),
			{
				...regular,
				...primary,
				gender: 'girls',
				part: 'bottom'
			}
		);
		await product(
			'Demo Girls Skirt, Senior',
			'uniform',
			uniforms,
			sized(bottomSizes.slice(3), 420, 30),
			{
				...regular,
				...senior,
				gender: 'girls',
				part: 'bottom'
			}
		);
		const tie = await product('Demo School Tie', 'uniform', uniforms, one(120), {
			...regular,
			...all,
			gender: 'unisex',
			part: 'accessory'
		});
		const belt = await product(
			'Demo School Belt',
			'uniform',
			uniforms,
			sized(['S', 'M', 'L'], 150, 20),
			{
				...regular,
				...all,
				gender: 'unisex',
				part: 'accessory'
			}
		);
		const socks = await product(
			'Demo School Socks, 3 pairs',
			'uniform',
			uniforms,
			sized(['S', 'M', 'L'], 180, 15),
			{
				...regular,
				...all,
				gender: 'unisex',
				part: 'accessory'
			}
		);
		// Sports: the house T-shirt is a size and a house colour.
		const houseTshirt: VariantSeed[] = [];
		for (const [i, size] of shirtSizes.entries()) {
			for (const house of ['Red', 'Blue', 'Green', 'Yellow']) {
				houseTshirt.push({
					label: `${size} · ${house} house`,
					size,
					house,
					price: rupees(280 + i * 20),
					stock: 10
				});
			}
		}
		await product('Demo House T-shirt', 'uniform', uniforms, houseTshirt, {
			...forSchool,
			...all,
			uniformType: 'sports',
			gender: 'unisex',
			part: 'top'
		});
		await product('Demo Track Pants', 'uniform', uniforms, sized(bottomSizes, 380, 25), {
			...forSchool,
			...all,
			uniformType: 'sports',
			gender: 'unisex',
			part: 'bottom'
		});
		await product('Demo Sweater', 'uniform', uniforms, sized(shirtSizes, 550, 40), {
			...forSchool,
			...all,
			uniformType: 'winter',
			gender: 'unisex',
			part: 'top'
		});
		await product(
			'Demo School Shoes',
			'uniform',
			uniforms,
			sized(['10C', '11C', '12C', '13C', '1', '2', '3', '4', '5', '6', '7', '8'], 650, 30),
			{
				...forSchool,
				...all,
				uniformType: 'regular',
				gender: 'unisex',
				part: 'footwear'
			}
		);

		// Sets for the demo school: Class 1 books, and the boys' regular uniform for Class 1 to 5.
		const bookSet = await ctx.db.insert('schoolSets', {
			schoolId: demoSchool,
			type: 'books',
			label: 'Class 1',
			classFrom: 1,
			classTo: 1,
			session: PLACEHOLDER_SESSION,
			sortOrder: 1,
			isActive: true
		});
		const bookLines: { variantId: Id<'productVariants'>; quantity: number; isOptional: boolean }[] =
			[
				...class1Books.map((variantId) => ({ variantId, quantity: 1, isOptional: false })),
				{ variantId: stationeryIds[0], quantity: 6, isOptional: true },
				{ variantId: stationeryIds[1], quantity: 1, isOptional: true }
			];
		for (const [i, line] of bookLines.entries()) {
			const variant = await ctx.db.get('productVariants', line.variantId);
			await ctx.db.insert('setItems', {
				setId: bookSet,
				productId: variant!.productId,
				variantId: line.variantId,
				quantity: line.quantity,
				isOptional: line.isOptional,
				sortOrder: i + 1
			});
		}

		const uniformSet = await ctx.db.insert('schoolSets', {
			schoolId: demoSchool,
			type: 'uniform',
			label: 'Boys regular, Class 1 to 5',
			classFrom: BANDS.primary.from,
			classTo: BANDS.primary.to,
			gender: 'boys',
			uniformType: 'regular',
			session: PLACEHOLDER_SESSION,
			sortOrder: 2,
			isActive: true
		});
		const uniformLines = [
			{ productId: boysShirt.productId, quantity: 2, isOptional: false },
			{ productId: boysShorts.productId, quantity: 2, isOptional: false },
			{ productId: belt.productId, quantity: 1, isOptional: false },
			{ productId: socks.productId, quantity: 1, isOptional: true },
			// one size: the line can name its variant like a book line
			{ productId: tie.productId, variantId: tie.variantIds[0], quantity: 1, isOptional: true }
		];
		for (const [i, line] of uniformLines.entries()) {
			await ctx.db.insert('setItems', { setId: uniformSet, ...line, sortOrder: i + 1 });
		}

		return `Seeded ${SCHOOLS.length} schools, the categories, demo books, stationery and uniforms, and 2 demo sets.`;
	}
});

async function insertProduct(
	ctx: MutationCtx,
	slugs: Set<string>,
	p: {
		title: string;
		kind: ProductKind;
		categoryId: Id<'categories'>;
		author?: string;
		publisher?: string;
		subject?: string;
		classFrom?: number;
		classTo?: number;
		schoolId?: Id<'schools'>;
		gender?: Gender;
		uniformType?: UniformType;
		part?: 'top' | 'bottom' | 'accessory' | 'footwear';
	},
	variants: VariantSeed[]
) {
	const productId = await ctx.db.insert('products', {
		...p,
		slug: reserveUniqueSlug(slugify(p.title), slugs),
		hsn: DEMO_HSN,
		gstRate: DEMO_GST,
		isActive: true,
		searchText: buildSearchText(p)
	});
	const variantIds: Id<'productVariants'>[] = [];
	for (const [i, variant] of variants.entries()) {
		const { stock, ...fields } = variant;
		const variantId = await ctx.db.insert('productVariants', {
			productId,
			...fields,
			mrp: variant.price,
			stock: 0,
			lowStockAt: 3,
			sortOrder: i + 1,
			isActive: true
		});
		// Opening stock goes through adjustStock like any other change, so the log starts complete.
		await adjustStock(ctx, { variantId, delta: stock, reason: 'received', by: 'system' });
		variantIds.push(variantId);
	}
	return { productId, variantIds };
}
