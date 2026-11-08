// Rupee inputs on admin forms. All maths stays in integer paise; these only convert at the edge.

/** Paise to what a rupee input shows: "120", "120.5" → "120.50". */
export const toRupeeInput = (paise: number | undefined | null) => {
	if (paise === undefined || paise === null) return '';
	const rupees = (paise / 100).toFixed(2);
	return rupees.endsWith('.00') ? rupees.slice(0, -3) : rupees;
};

/** A rupee input to paise; `undefined` for blank, `null` for something that isn't an amount. */
export const parseRupees = (text: string): number | undefined | null => {
	const value = text.trim().replace(/,/g, '');
	if (!value) return undefined;
	if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
	const [whole, fraction = ''] = value.split('.');
	return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
};
