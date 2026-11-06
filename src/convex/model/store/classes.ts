// Classes as numbers, so a set or a uniform item can cover a range ("Class 1 to 5") and lists sort
// in school order. Pre-primary is below 1: Mont-01 (Nur) = -2, Mont-02 (Jr. KG) = -1, Mont-03
// (Sr. KG) = 0. Labels follow the live site's Ryan class list.

export const CLASS_LABELS: Record<number, string> = {
	[-2]: 'Mont-01 (Nur)',
	[-1]: 'Mont-02 (Jr. KG)',
	0: 'Mont-03 (Sr. KG)',
	...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, `Class ${i + 1}`]))
};

export const FIRST_CLASS = -2;
export const LAST_CLASS = 12;

export const isClassOrder = (value: number) =>
	Number.isInteger(value) && value >= FIRST_CLASS && value <= LAST_CLASS;

/**
 * Class bands that uniforms usually differ by: boys wear shorts up to Class 5 and trousers from
 * Class 6. TODO (dictate): the real bands per school (store-profile.md).
 */
export const PLACEHOLDER_CLASS_BANDS = {
	prePrimary: { from: -2, to: 0 },
	primary: { from: 1, to: 5 },
	senior: { from: 6, to: 12 }
} as const;
