// What a parent has picked on a set page, and what it costs. Pure, in integer paise, shared by the
// set page (for display) and, from step 4, by the cart. Every line of a set is the parent's choice
// (dictated 2026-11-07: "full freedom for the customer"), so a line counts only while it is ticked,
// has a size chosen, and that size is in stock. The parent may also change how many copies of a line
// they want (dictated 2026-11-08); until they do, the set's own quantity is used.

export type SelectableOption = {
	variantId: string;
	price: number;
	availability: 'in_stock' | 'few_left' | 'out';
};

export type SelectableLine = {
	id: string;
	quantity: number;
	/** One option for a book; one per size for a uniform piece */
	options: SelectableOption[];
};

export type Selection = Record<string, { ticked: boolean; variantId?: string; quantity?: number }>;

/** Copies wanted for a line: the parent's choice, else the set's own quantity */
export const chosenQuantity = (line: SelectableLine, pick: Selection[string] | undefined) =>
	pick?.quantity ?? line.quantity;

export type SelectionSummary = {
	/** Sum of price × chosen quantity over the lines that count, in paise */
	total: number;
	/** Lines that count */
	count: number;
	/** Ticked lines still waiting for a size */
	needSize: number;
	/** Ticked lines whose chosen size is out of stock, so they cannot be bought */
	unavailable: number;
};

const isBuyable = (option: SelectableOption) => option.availability !== 'out';

/** Everything ticked; a line with a single in-stock option has that option chosen already. */
export const defaultSelection = (lines: SelectableLine[]): Selection =>
	Object.fromEntries(
		lines.map((line) => {
			const buyable = line.options.filter(isBuyable);
			const only = line.options.length === 1 ? buyable[0] : undefined;
			return [line.id, { ticked: buyable.length > 0, variantId: only?.variantId }];
		})
	);

export const summariseSelection = (
	lines: SelectableLine[],
	selection: Selection
): SelectionSummary => {
	const summary: SelectionSummary = { total: 0, count: 0, needSize: 0, unavailable: 0 };
	for (const line of lines) {
		const pick = selection[line.id];
		if (!pick?.ticked) continue;
		const option = line.options.find((o) => o.variantId === pick.variantId);
		if (!option) summary.needSize += 1;
		else if (!isBuyable(option)) summary.unavailable += 1;
		else {
			summary.total += option.price * chosenQuantity(line, pick);
			summary.count += 1;
		}
	}
	return summary;
};
