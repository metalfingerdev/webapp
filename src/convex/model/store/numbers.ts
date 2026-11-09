// Readable numbers for orders and enquiries: read out over the phone, so no 0/O or 1/I.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `AK-` + 8 characters for an order, `EQ-` + 6 for an enquiry. The caller checks it is unused. */
export const readableNumber = (prefix: string, length: number) =>
	`${prefix}-${Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')}`;
