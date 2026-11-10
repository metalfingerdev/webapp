import { defineConfig, devices } from '@playwright/test';

// The suite signs in, saves addresses and places orders, so it only ever runs against a dev
// deployment: the one `npx convex dev` uses (CONVEX_DEPLOYMENT), which the app must also talk to
// (PUBLIC_CONVEX_URL). Anything else, staging included, stops it before a browser opens.
try {
	process.loadEnvFile('.env.local');
} catch {
	// No .env.local: the variables come from the shell
}

const deployment = (process.env.CONVEX_DEPLOYMENT ?? '').split(/\s/)[0];
const devName = deployment.startsWith('dev:') ? deployment.slice('dev:'.length) : '';
const appHost = URL.canParse(process.env.PUBLIC_CONVEX_URL ?? '')
	? new URL(process.env.PUBLIC_CONVEX_URL!).hostname
	: '';
if (!devName || appHost.split('.')[0] !== devName) {
	throw new Error(
		'E2E tests run only against a dev deployment: CONVEX_DEPLOYMENT must be dev:<name> and ' +
			'PUBLIC_CONVEX_URL must point at that same deployment (docs/09-testing.md).'
	);
}

const baseURL = 'http://localhost:5173';

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: 'list',
	timeout: 60_000,
	expect: { timeout: 15_000 },
	use: { baseURL, trace: 'retain-on-failure' },
	projects: [
		{ name: 'setup', testMatch: /\.setup\.ts$/ },
		{
			name: 'phone',
			testMatch: /\.spec\.ts$/,
			dependencies: ['setup'],
			use: { ...devices['Pixel 7'] }
		}
	],
	webServer: {
		command: 'pnpm dev',
		url: baseURL,
		reuseExistingServer: true,
		timeout: 120_000
	}
});
