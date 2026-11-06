// Placeholder business values until the client decides them. Each one is TODO (dictate) in
// .agents/skills/store-app/references/store-profile.md; the seed copies them into the
// `storeSettings` row, where the admin changes them. Never put the shop's phone, email, GSTIN or
// address here: the repo is public.

/** TODO (dictate): flat shipping fee. Placeholder ₹79. */
export const PLACEHOLDER_SHIPPING_FEE = 79_00;

/** TODO (dictate): orders from this subtotal ship free. Placeholder ₹999. */
export const PLACEHOLDER_FREE_SHIPPING_FROM = 999_00;

/** TODO (dictate): days after delivery a return is accepted. Placeholder 7. */
export const PLACEHOLDER_RETURN_WINDOW_DAYS = 7;

/** TODO (dictate): current academic session. Placeholder 2026-27. */
export const PLACEHOLDER_SESSION = '2026-27';

/**
 * TODO (dictate): cash on delivery. Placeholder: online payment only. Cancelling is allowed until
 * the order is packed (placeholder, enforced by transitionOrder from step 5).
 */
export const PLACEHOLDER_COD_ENABLED = false;

/** The name customers see. The legal name for invoices is typed into /admin/settings. */
export const STORE_NAME = 'Aggarwal Kart';
