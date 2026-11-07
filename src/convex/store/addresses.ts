// A customer's address book. Every function is the signed-in customer's own (requireCustomer, no
// user argument); a row that is missing and a row that belongs to someone else get the same answer.
import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server.js';
import { requireCustomer } from '../model/store/access.js';
import { normalizeIndianMobile } from '../otp/phone.js';
import { isIndianPincode } from './validators.js';

export const MAX_ADDRESSES = 10;

const addressRow = v.object({
	id: v.id('addresses'),
	name: v.string(),
	phone: v.string(),
	line1: v.string(),
	line2: v.optional(v.string()),
	landmark: v.optional(v.string()),
	city: v.string(),
	state: v.string(),
	pincode: v.string(),
	isDefault: v.boolean()
});

export const list = query({
	args: {},
	returns: v.array(addressRow),
	handler: async (ctx) => {
		const user = await requireCustomer(ctx);
		const rows = await ctx.db
			.query('addresses')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.take(MAX_ADDRESSES);
		return rows
			.sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
			.map(({ _id, userId: _userId, _creationTime, ...rest }) => ({ id: _id, ...rest }));
	}
});

const text = (value: string, label: string, max: number) => {
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > max) throw new ConvexError(`${label} is required`);
	return trimmed;
};
const optionalText = (value: string | undefined, max: number) => {
	const trimmed = value?.trim();
	return trimmed ? trimmed.slice(0, max) : undefined;
};

/** Adds an address, or changes one when `id` is given. The first address becomes the default. */
export const save = mutation({
	args: {
		id: v.optional(v.id('addresses')),
		name: v.string(),
		phone: v.string(),
		line1: v.string(),
		line2: v.optional(v.string()),
		landmark: v.optional(v.string()),
		city: v.string(),
		state: v.string(),
		pincode: v.string(),
		makeDefault: v.boolean()
	},
	returns: v.id('addresses'),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const phone = normalizeIndianMobile(args.phone);
		if (!phone) throw new ConvexError('Enter a valid 10-digit mobile number');
		const pincode = args.pincode.trim();
		if (!isIndianPincode(pincode)) throw new ConvexError('Enter a valid 6-digit pincode');
		const fields = {
			name: text(args.name, 'Name', 80),
			phone,
			line1: text(args.line1, 'Address', 120),
			line2: optionalText(args.line2, 120),
			landmark: optionalText(args.landmark, 80),
			city: text(args.city, 'City', 60),
			state: text(args.state, 'State', 60),
			pincode
		};

		const all = await ctx.db
			.query('addresses')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.take(MAX_ADDRESSES + 1);
		const existing = args.id ? all.find((row) => row._id === args.id) : undefined;
		if (args.id && !existing) throw new ConvexError('Address not found');
		if (!existing && all.length >= MAX_ADDRESSES) {
			throw new ConvexError(`You can save up to ${MAX_ADDRESSES} addresses`);
		}

		const isDefault = args.makeDefault || all.length === 0 || (existing?.isDefault ?? false);
		if (isDefault) {
			for (const row of all) {
				if (row.isDefault && row._id !== existing?._id) {
					await ctx.db.patch('addresses', row._id, { isDefault: false });
				}
			}
		}
		if (existing) {
			await ctx.db.patch('addresses', existing._id, { ...fields, isDefault });
			return existing._id;
		}
		return ctx.db.insert('addresses', { userId: user._id, ...fields, isDefault });
	}
});

export const remove = mutation({
	args: { id: v.id('addresses') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireCustomer(ctx);
		const row = await ctx.db.get('addresses', args.id);
		if (!row || row.userId !== user._id) throw new ConvexError('Address not found');
		await ctx.db.delete('addresses', row._id);
		if (row.isDefault) {
			const next = await ctx.db
				.query('addresses')
				.withIndex('by_userId', (q) => q.eq('userId', user._id))
				.first();
			if (next) await ctx.db.patch('addresses', next._id, { isDefault: true });
		}
		return null;
	}
});
