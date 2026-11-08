// The set page's total is the money the parent sees before adding to the cart: it must follow the
// quantities they chose and leave out unticked, unsized and out-of-stock lines.
import { describe, expect, it } from 'vitest';
import { summariseSelection, type SelectableLine } from './setSelection';

const lines: SelectableLine[] = [
	{ id: 'a', quantity: 1, options: [{ variantId: 'a1', price: 25000, availability: 'in_stock' }] },
	{ id: 'b', quantity: 2, options: [{ variantId: 'b1', price: 4950, availability: 'few_left' }] },
	{ id: 'c', quantity: 1, options: [{ variantId: 'c1', price: 9900, availability: 'out' }] },
	{
		id: 'd',
		quantity: 1,
		options: [
			{ variantId: 'd1', price: 30000, availability: 'in_stock' },
			{ variantId: 'd2', price: 32000, availability: 'in_stock' }
		]
	},
	{ id: 'e', quantity: 1, options: [{ variantId: 'e1', price: 1000, availability: 'in_stock' }] }
];

describe('summariseSelection', () => {
	it('totals the chosen quantities and skips what cannot be bought', () => {
		const summary = summariseSelection(lines, {
			a: { ticked: true, variantId: 'a1', quantity: 3 }, // parent wants 3 copies
			b: { ticked: true, variantId: 'b1' }, // the set's own 2
			c: { ticked: true, variantId: 'c1' }, // out of stock
			d: { ticked: true }, // no size yet
			e: { ticked: false, variantId: 'e1', quantity: 5 } // unticked
		});
		expect(summary).toEqual({ total: 3 * 25000 + 2 * 4950, count: 2, needSize: 1, unavailable: 1 });
	});
});
