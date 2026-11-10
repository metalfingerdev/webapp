import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { expect, test as setup } from '@playwright/test';
import { CUSTOMER_STATE, customerPhone as phone, NO_CUSTOMER } from './accounts';

// Signs the test customer in once with phone OTP and keeps the session for the specs. Dev uses the
// console OTP channel, which logs "[otp:console] code for +91******1234: 123456".
setup.skip(!phone, NO_CUSTOMER);
setup('sign in the test customer', async ({ page }) => {
	// A saved session that still works is reused, so repeated runs don't spend OTPs
	if (existsSync(CUSTOMER_STATE)) {
		await page.context().addCookies(JSON.parse(readFileSync(CUSTOMER_STATE, 'utf8')).cookies);
		const session = await page.request.get('/api/auth/get-session');
		if (session.ok() && (await session.json())?.user) return;
		await page.context().clearCookies();
	}

	await page.goto('/signin');
	// Typing before the page hydrates is wiped out; Continue turns on only once Svelte has the field
	await expect(async () => {
		await page.locator('#phone').fill(phone.slice(3));
		await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled({
			timeout: 1_000
		});
	}).toPass();
	const sentAt = Date.now() / 1000;
	await page.locator('#phone').press('Enter');
	await page.locator('#otp').fill(await otpFromLogs(phone.slice(-4), sentAt));
	await page.locator('#otp').press('Enter');

	// A brand-new account is asked for a name first; anyone else leaves the sign-in page
	const name = page.locator('#name');
	const signedIn = (url: URL) => !url.pathname.startsWith('/signin');
	await Promise.race([
		name.waitFor().catch(() => {}),
		page.waitForURL(signedIn, { waitUntil: 'commit' }).catch(() => {})
	]);
	if (await name.isVisible()) {
		await name.fill('Test Customer');
		await name.press('Enter');
	}
	await expect(page).not.toHaveURL(/\/signin/);
	await page.context().storageState({ path: CUSTOMER_STATE });
});

/** The first console OTP for the phone ending in `last4` logged after `since` (seconds). */
function otpFromLogs(last4: string, since: number): Promise<string> {
	const line = new RegExp(`\\[otp:console\\] code for \\+91\\*+${last4}: (\\d{6})`);
	return new Promise((resolve, reject) => {
		const logs = spawn('npx', ['convex', 'logs', '--history', '50', '--jsonl'], {
			stdio: ['ignore', 'pipe', 'ignore']
		});
		const timer = setTimeout(() => {
			logs.kill();
			reject(new Error('No OTP in the Convex logs after 30 s. Is OTP_CHANNELS=console on dev?'));
		}, 30_000);
		let buffer = '';
		logs.stdout.on('data', (chunk: Buffer) => {
			buffer += chunk.toString();
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const raw of lines) {
				let event: { timestamp?: number; logLines?: unknown };
				try {
					event = JSON.parse(raw);
				} catch {
					continue;
				}
				// Allow a few seconds of clock difference between this machine and Convex
				if ((event.timestamp ?? 0) < since - 5) continue;
				const code = JSON.stringify(event.logLines ?? '').match(line)?.[1];
				if (code) {
					clearTimeout(timer);
					logs.kill();
					resolve(code);
					return;
				}
			}
		});
	});
}
