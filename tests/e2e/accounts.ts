// The test accounts, from .env.local (gitignored). Use numbers that belong to test accounts on the dev
// deployment, never a real person's.
const phone = process.env.E2E_USER_PHONE?.replace(/\s/g, '') ?? '';

/** The test customer's phone as +91XXXXXXXXXX, or '' when it is not set. */
export const customerPhone = /^\+91\d{10}$/.test(phone) ? phone : '';
export const NO_CUSTOMER = 'Set E2E_USER_PHONE=+91XXXXXXXXXX in .env.local (docs/09-testing.md)';

/** Where the setup keeps the customer's signed-in session (gitignored). */
export const CUSTOMER_STATE = 'tests/e2e/.auth/customer.json';
