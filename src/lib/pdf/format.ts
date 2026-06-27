// src/lib/pdf/format.ts
//
// Display formatting for the PDFs. Money is stored in paise everywhere; these
// turn it into ₹ strings. The ₹ glyph renders via pdfmake's bundled Roboto.

// Whole rupee amounts print without decimals (₹4,678), fractional ones keep two
// (₹150.01) — matches the sample documents.
export function inr(paise: number): string {
	const rupees = paise / 100;
	const hasFraction = Math.round(rupees * 100) % 100 !== 0;
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		minimumFractionDigits: hasFraction ? 2 : 0,
		maximumFractionDigits: 2
	}).format(rupees);
}

export function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString('en-IN', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

// Safe filename fragment from an order reference (no path/illegal chars).
export function safeRef(ref: string): string {
	return ref.replace(/[^a-zA-Z0-9_-]/g, '');
}
