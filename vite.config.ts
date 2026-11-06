import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// bits-ui ships .svelte files, so it has to be compiled with the app on the server too
	ssr: { noExternal: ['bits-ui'] },
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),

			// Vercel in Mumbai (bom1), the closest region for most Indian users. Runtime is pinned so
			// builds don't depend on the local Node version. See https://svelte.dev/docs/kit/adapter-vercel
			adapter: adapter({ runtime: 'nodejs22.x', regions: ['bom1'] }),

			alias: {
				$convex: './src/convex',
				$components: './src/components',
				$types: './src/types'
			}
		})
	]
});
