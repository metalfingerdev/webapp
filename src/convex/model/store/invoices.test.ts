// The financial year decides which counter an invoice number comes from, so the turn of the year
// must fall at midnight India time, not midnight UTC.
import { describe, expect, it } from 'vitest';
import { financialYear } from './invoices';

describe('financialYear', () => {
	it('turns over at 1 April 00:00 India time', () => {
		expect(financialYear(Date.parse('2027-03-31T18:29:59Z'))).toBe('2026-27'); // 23:59:59 IST, 31 March
		expect(financialYear(Date.parse('2027-03-31T18:30:00Z'))).toBe('2027-28'); // 00:00 IST, 1 April
	});

	it('runs a calendar year late in the year and early in the next', () => {
		expect(financialYear(Date.parse('2026-12-31T20:00:00Z'))).toBe('2026-27'); // already 1 Jan in IST
		expect(financialYear(Date.parse('2099-06-01T00:00:00Z'))).toBe('2099-00'); // century wraps to 00
	});
});
