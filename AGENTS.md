<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Project notes

Aggarwal Kart: a school books, uniforms and stationery store on SvelteKit 3 + Convex + Better Auth.
The auth stack (phone OTP, Google, email with Resend, admin pages) comes from the
`sveltekit-convex-auth-template`; the store (catalogue, schools and bundles, cart, Razorpay checkout,
orders, PDFs, dashboard, stock import) is this repo's own. See `README.md`, `docs/README.md` and
`docs/overview.md`.

- Read `src/convex/_generated/ai/guidelines.md` and `src/convex/CONVENTIONS.md` before touching Convex code.
- Check with `pnpm check` and `npx tsc -p src/convex --noEmit`; both must pass.
- Never accept a `userId` argument for authorization; derive the user on the server.
- Store staff are the template's app admins (Better Auth `role`, or `ADMIN_USER_IDS`). Guard every
  dashboard function with `requireAppAdmin` (`src/convex/model/admin/index.ts`). There is no `users`
  or `userRoles` table: owners are stored as `userId: v.string()` holding `user._id`.
- **Money is integer paise; GST rates are basis points.** Use `loadSettings` / `calculateOrder`
  (`src/convex/lib/`), not ad-hoc math.
- Convex functions live in `src/convex/` and use `.js` import extensions for webapp's own files.
- Secrets live in Convex env vars, never in the repo.
- Deploys: merging to `main` deploys through Vercel (`vercel.json`); CI runs on every PR.

## Commands

| Command                          | What it does                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                       | SvelteKit and `convex dev` together                                              |
| `pnpm check`                     | type-check Svelte + TS (must be 0 errors)                                        |
| `npx tsc -p src/convex --noEmit` | type-check the Convex functions                                                  |
| `pnpm test`                      | Vitest: `src/convex/**/*.test.ts` on `edge-runtime`, `src/**/*.spec.ts` on jsdom |
| `pnpm lint`                      | Prettier + ESLint                                                                |

Tests need `PUBLIC_CONVEX_URL` and `PUBLIC_CONVEX_SITE_URL` set (any value; `.env.local` has them).
Convex ignores file names with more than one dot, so `foo.test.ts` is never deployed. **Only real
tests**: each must be able to fail when the behaviour it guards breaks.

## Conventions

- **Formatting:** webapp's own files use tabs and single quotes (`.prettierrc`); files copied from the template keep the template's style and are
  listed in `.prettierignore` / `eslint.config.js`. Keep a file's existing style and never reformat
  files you aren't changing.
- **The UI uses our own palette and Bits UI.** Colours come from `src/themes/palette.css` only:
  layers `background` (darkest) < `midground` < `foreground` (lightest), plus `text`, `text-muted`,
  `primary`, `secondary`, `on-secondary`, `danger`, `warning`, `success`, `info`, `border`. Never
  reorder the layers. Light only: there is no dark mode. Build screens from `src/lib/ui` and the
  Bits wrappers in `src/lib/primitives/ui`. Borders and hard shadows are never black: use the
  `edge`, `edge-flat` and `edge-press` utilities in `src/app.css` and set `--fill` to the element's
  own background.
- **Use `src/lib/ui` components first**; the dashboard screens use the small kit in
  `src/components/dashboard/ui`, styled with the same palette. For elements that can't be one
  (triggers, links, native controls) `src/app.css` has our own utilities: `button`, `tone-*`,
  `tag`, `panel`, `control`, `field-label`, `data-table`, `bone`. Colours are the palette names only (`bg-foreground`, `text-text-muted`,
  `border-border-muted`, `bg-danger-tint`, ...).
- **No long Tailwind class lists inline.** Give the element a short semantic class and put the
  Tailwind in the component's style block: `<style lang="postcss">`, `@reference 'src/app.css';`,
  then rules with `@apply`. One or two layout utilities in markup are fine.
- **Routes are private by default.** Add a route to `isPublic` in `src/hooks.server.ts` only if it
  is meant for signed-out visitors. A private page opened by client-side navigation also calls
  `useRequireSignIn()` (`src/lib/auth/requireSignIn.svelte.ts`). Route checks are UX; the Convex
  function check is security.

## Skills

Skills live in `.agents/skills/<name>/`; `.claude/skills/<name>` is a symlink to the same folder.

| Skill       | Use it for                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store-app` | rebuilding the Aggarwal Kart shop step by step: catalogue, school sets, cart, checkout, Razorpay, orders, shipping, admin, GST invoices, Product On Demand. Read `references/store-profile.md` first (decisions and `TODO (dictate)` values) |
