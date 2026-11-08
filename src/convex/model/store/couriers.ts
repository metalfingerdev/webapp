// The couriers staff pick from when shipping (shipping.md). TODO (dictate): which couriers the shop
// really uses, and each one's tracking-link format. Until then no link is made up: staff paste the
// courier's tracking link if they have one.
export const COURIERS = ['India Post', 'DTDC', 'Delhivery', 'Blue Dart', 'Other'] as const;

/** An AWB (the courier's tracking number): letters, digits and dashes, 4 to 40 characters. */
export const isAwb = (value: string) => /^[A-Za-z0-9-]{4,40}$/.test(value);

/** A tracking link staff pasted: must be a plain https address. */
export const isTrackingUrl = (value: string) => {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && value.length <= 300;
	} catch {
		return false;
	}
};
