import { expect, test } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../src/convex/_generated/api.js';
import { CUSTOMER_STATE, customerPhone, NO_CUSTOMER } from './accounts';

test.describe('signed out', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('checkout sends the visitor to sign-in', async ({ page }) => {
		await page.goto('/checkout');
		await expect(page).toHaveURL(/\/signin/);
	});
});

test.describe('customer', () => {
	test.skip(!customerPhone, NO_CUSTOMER);
	test.use({ storageState: CUSTOMER_STATE });

	test('admin is refused, on the page and in Convex', async ({ page }) => {
		await page.goto('/admin');
		await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();

		// The page only hides the admin; the boundary is requireAppAdmin, so call it with the
		// customer's own token. The same token must work for a customer function, or the refusal
		// would prove nothing.
		const { token } = await (await page.request.get('/api/auth/convex/token')).json();
		const convex = new ConvexHttpClient(process.env.PUBLIC_CONVEX_URL!);
		convex.setAuth(token);
		await expect(convex.query(api.store.addresses.list, {})).resolves.toBeInstanceOf(Array);
		await expect(convex.query(api.store.admin.orders.board, { dayStart: 0 })).rejects.toThrow(
			/admin role required/
		);
	});

	test('cash on delivery order: same total as checkout, then cancelled', async ({ page }) => {
		// Any in-stock product; a uniform needs a size first
		await page.goto('/shop?stock=1');
		await page.locator('a.card').first().click();
		const size = page.locator('input[name="size"]:not([disabled])');
		if (await size.count()) await size.first().check();
		// A click before the page hydrates does nothing, so retry; the drawer opens once the cart is saved
		await expect(async () => {
			await page.getByRole('button', { name: 'Add to cart' }).click();
			await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
		}).toPass();

		await page.goto('/checkout');
		const pincode = page.getByLabel('Pincode');
		await expect(pincode.or(page.locator('li.address').first())).toBeVisible();
		if (await pincode.isVisible()) {
			await page.getByLabel('Full name').fill('Test Customer');
			await page.getByLabel('Mobile number').fill(customerPhone.slice(3));
			await page.getByLabel('House no., street, area').fill('1 Test Street');
			await pincode.fill('121001');
			await page.getByLabel('City').fill('Faridabad');
			await page.getByLabel('State').fill('Haryana');
			await page.getByRole('button', { name: 'Save address' }).click();
		}
		await page.getByRole('radio', { name: /Cash on delivery/ }).check();
		const place = page.getByRole('button', { name: 'Place order' });
		await expect(place).toBeEnabled();
		const total = (await page.locator('dl.sums div.total dd').textContent())!.trim();

		await place.click();
		await expect(page).toHaveURL(/\/orders\/[^/?]+\?placed=1$/);
		await expect(page.getByText('Thank you, your order is placed.')).toBeVisible();
		await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
		await expect(page.locator('dl.sums div.total dd')).toHaveText(total);

		// Cancelling puts the stock back, so dev data is the same after every run
		await page.getByRole('button', { name: 'Cancel order' }).click();
		await page.getByRole('button', { name: 'Yes, cancel' }).click();
		await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
	});
});
