import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import convex from '@convex-dev/eslint-plugin';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import globals from 'globals';

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,

	prettier,
	...svelte.configs.prettier,
	...convex.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],

		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser
			}
		}
	},
	{
		// Build outputs and generated code — never lint these.
		ignores: [
			// The old store, outside the build until step 10 deletes it.
			'legacy/**',
			// Copied from the sveltekit-convex-auth-template; linted by its rules, not ours.
			'src/lib/auth/**',
			'src/lib/users/**',
			'src/lib/admin/**',
			'src/lib/organizations/**',
			'src/lib/primitives/**',
			'src/lib/ui/**',
			'src/lib/index.ts',
			'src/convex/betterAuth/**',
			'src/convex/otp/**',
			'src/convex/model/admin/**',
			'src/convex/model/emails/**',
			'src/convex/model/organizations/**',
			'src/convex/users/**',
			'src/convex/admin/**',
			'src/convex/organizations/**',
			'src/convex/auth.ts',
			'src/convex/auth.config.ts',
			'src/convex/auth.constants.ts',
			'src/convex/auth.constants.types.ts',
			'src/convex/email.ts',
			'src/convex/deviceAuthorization.ts',
			'src/convex/migrations.ts',
			'src/convex/polyfills.ts',
			'src/convex/storage.ts',
			'src/convex/url.ts',
			'src/convex/http.ts',
			'src/convex/convex.config.ts',
			'src/routes/(auth)/**',
			'src/routes/account/**',
			'src/routes/api/**',
			'src/routes/+layout.server.ts',
			'src/env.ts',
			'src/hooks.server.ts',
			'src/themes/**',
			'dist/**',
			'build/**',
			'.svelte-kit/**',
			'.vercel/**',
			'.output/**',
			'src/convex/_generated/**'
		]
	}
];
