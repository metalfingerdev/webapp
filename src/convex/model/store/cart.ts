// Cart rules that need no database: the caps (TODO (dictate), placeholders) and how lines merge.
// The functions in store/cart.ts do the reading and writing around these.

/** Most different lines one cart may hold. TODO (dictate): placeholder. */
export const MAX_CART_LINES = 20;
/** Most copies of one line. TODO (dictate): placeholder. */
export const MAX_LINE_QUANTITY = 10;

export type LooseLine = { variantId: string; quantity: number; fromSetId?: string };

/**
 * Lines with the same variant become one (quantities add up, the first `fromSetId` stays), whole
 * numbers only, each between 1 and the per-line cap, at most MAX_CART_LINES lines, order kept.
 */
export const mergeLines = <T extends LooseLine>(...lists: T[][]): T[] => {
	const byVariant = new Map<string, T>();
	for (const line of lists.flat()) {
		const quantity = Math.floor(line.quantity);
		if (!Number.isFinite(quantity) || quantity < 1) continue;
		const seen = byVariant.get(line.variantId);
		if (seen) seen.quantity = Math.min(seen.quantity + quantity, MAX_LINE_QUANTITY);
		else if (byVariant.size < MAX_CART_LINES) {
			byVariant.set(line.variantId, { ...line, quantity: Math.min(quantity, MAX_LINE_QUANTITY) });
		}
	}
	return [...byVariant.values()];
};
