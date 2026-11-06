import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

// Convex tests are *.test.ts next to the code. Convex ignores file names with more than one dot, so
// they are never bundled into a deploy. `edge-runtime` matches where Convex functions run.
// The app's own unit tests are *.spec.ts and run in jsdom.
export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'convex',
					environment: 'edge-runtime',
					server: { deps: { inline: ['convex-test'] } },
					include: ['src/convex/**/*.test.ts']
				}
			},
			{
				plugins: [tailwindcss(), sveltekit()],
				test: {
					name: 'app',
					environment: 'jsdom',
					include: ['src/**/*.spec.{js,ts}'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			}
		]
	}
});
