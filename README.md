# Aggarwal Kart

The rebuilt online store for **Aggarwal Books And Stationery Mart**, a bookshop in Faridabad. Parents
buy their child's school book set and uniform by school and class; the shop also sells NCERT books,
sample papers, entrance-exam and language books, and stationery. It replaces the WooCommerce site at
aggarwalkart.in.

SvelteKit 3 + Svelte 5, Convex (database and functions), Better Auth inside Convex (phone OTP first),
Razorpay, Resend, pdfmake, Tailwind CSS 4 + Bits UI, pnpm, Vercel.

**This repo is staging.** `main` deploys the staging site; the live store launches later from a separate
repo ([launch checklist](docs/launch.md)).

## Documentation

- **[Working with Claude Code](docs/working-with-claude.md)**: how sessions work on this project
  (`/next-step`, `/wrap-up`). Start here.
- [AGENTS.md](AGENTS.md): the rules every session follows
- [Developer docs](docs/README.md): setup, auth, phone OTP, email, environments, testing, UI, launch
- [Store profile](.agents/skills/store-app/references/store-profile.md): the roadmap, what is built,
  decisions and what the client still has to dictate
- [Convex conventions](src/convex/CONVENTIONS.md): backend rules; read before touching `src/convex/`

The old store lives in `legacy/` (kept for good, not built). Its docs are kept for reference in
[docs/old-store/](docs/old-store/).

## Local development

```bash
pnpm install    # pnpm only; also turns on the git hooks in .githooks/
pnpm dev        # SvelteKit (http://localhost:5173) and `convex dev` together
```

To run them separately use `pnpm dev:frontend` and `pnpm dev:backend`. Full setup, including the first
admin and the seed: [docs/02-getting-started.md](docs/02-getting-started.md).

## Environment variables

Set locally in `.env.local` and in the Vercel project:

| Variable                 | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `PUBLIC_CONVEX_URL`      | Convex deployment URL (client + SSR)                     |
| `PUBLIC_CONVEX_SITE_URL` | Convex site URL used by the auth handler                 |
| `PUBLIC_APP_ENV`         | `staging` on the staging site (keeps search engines out) |
| `CONVEX_DEPLOYMENT`      | Convex deployment name (CLI, local only)                 |

The `PUBLIC_*` values are needed at build time as well as runtime. Convex's own env vars (auth, OTP,
Razorpay, Resend) are listed in [docs/05-configuration.md](docs/05-configuration.md) and
[docs/08-environments-and-deployment.md](docs/08-environments-and-deployment.md).

## Scripts

| Command                                | Description                                                           |
| -------------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                             | Frontend + Convex dev backend                                         |
| `pnpm check`                           | `svelte-check` type checking                                          |
| `pnpm exec tsc -p src/convex --noEmit` | Type-check the Convex functions                                       |
| `pnpm test`                            | Vitest (Convex functions and UI helpers)                              |
| `pnpm test:e2e`                        | Playwright against the dev deployment ([docs/09](docs/09-testing.md)) |
| `pnpm lint`                            | Prettier + ESLint                                                     |
| `pnpm format`                          | Format with Prettier                                                  |
| `pnpm build`                           | Production build (`@sveltejs/adapter-vercel`)                         |
| `pnpm preview`                         | Preview the production build locally                                  |

## Deployment

Work goes branch → draft PR → CI → merge. Vercel builds only `main` (`vercel.json`), deploying the
Convex functions and then the site in one build. Details:
[docs/08-environments-and-deployment.md](docs/08-environments-and-deployment.md).
