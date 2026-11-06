import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Deployed on Vercel. Runtime is pinned so builds don't depend on the
		// local Node version. See https://svelte.dev/docs/kit/adapter-vercel
		adapter: adapter({ runtime: 'nodejs22.x' }),
		alias: {
			$convex: './src/convex',
			$components: './src/components',
			$types: './src/types'
		}
	}
};

export default config;
