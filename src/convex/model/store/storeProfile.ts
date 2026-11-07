// Placeholder business values until the client decides them. Each one is TODO (dictate) in
// .agents/skills/store-app/references/store-profile.md; the seed copies them into the
// `storeSettings` row, where the admin changes them. Never put the shop's phone, email, GSTIN or
// address here: the repo is public.

/**
 * TODO (dictate): the delivery zones. Placeholders ("typical", 2026-11-07): the shop's own delivery in
 * Faridabad, and courier delivery everywhere else. The seed creates them; the admin edits them later.
 */
export const PLACEHOLDER_ZONES = {
	local: {
		name: 'Faridabad',
		fee: 40_00,
		freeFrom: 500_00,
		estimate: 'Same day or within 1 to 2 days',
		// TODO (dictate): confirm this list with the client. Faridabad's postal codes, as far as known.
		pincodes: [
			'121001',
			'121002',
			'121003',
			'121004',
			'121005',
			'121006',
			'121007',
			'121008',
			'121009',
			'121010'
		]
	},
	courier: {
		name: 'Rest of India',
		fee: 79_00,
		freeFrom: 999_00,
		estimate: '3 to 7 business days after dispatch'
	}
};

/** TODO (dictate): days after delivery a return is accepted. Placeholder 7. */
export const PLACEHOLDER_RETURN_WINDOW_DAYS = 7;

/** TODO (dictate): current academic session. Placeholder 2026-27. */
export const PLACEHOLDER_SESSION = '2026-27';

/** Cash on delivery is offered (dictated 2026-11-07). A COD fee, if any, is TODO (dictate): none. */
export const PLACEHOLDER_COD_ENABLED = true;

/** The name customers see. The legal name for invoices is typed into /admin/settings. */
export const STORE_NAME = 'Aggarwal Kart';

/**
 * Whether a customer may choose "Pay online" at checkout. Off until step 6 adds Razorpay: with no
 * gateway an online order could never be paid. Step 6 turns it on and adds the payment-window expiry.
 */
export const ONLINE_PAYMENT_ENABLED = false;
