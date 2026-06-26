# Store

An e-commerce storefront built with **SvelteKit** and a **Convex** backend
(auth via `@convex-dev/better-auth`, payments via Razorpay). Deployed on
**Vercel**.

## Documentation

- [Overview](docs/overview.md) — architecture, stack, and how the pieces fit
- [Deployment & production readiness](docs/deployment.md) — going live + the pre-launch checklist

## Local development

```bash
pnpm install
pnpm dev        # runs the SvelteKit frontend + `convex dev` together
```

`pnpm dev` starts the Vite frontend and the Convex dev backend concurrently.
To run them separately use `pnpm dev:frontend` and `pnpm dev:backend`.

## Environment variables

Set these locally in `.env.local` and in the Vercel project settings:

| Variable                 | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `PUBLIC_CONVEX_URL`      | Convex deployment URL (client + SSR)     |
| `PUBLIC_CONVEX_SITE_URL` | Convex site URL used by the auth handler |
| `CONVEX_DEPLOYMENT`      | Convex deployment name (CLI / dev)       |

The `PUBLIC_*` values are required at build time as well as runtime.

## Scripts

| Command        | Description                                   |
| -------------- | --------------------------------------------- |
| `pnpm dev`     | Frontend + Convex backend in parallel         |
| `pnpm build`   | Production build (`@sveltejs/adapter-vercel`) |
| `pnpm preview` | Preview the production build locally          |
| `pnpm test`    | Unit tests (Vitest)                           |
| `pnpm check`   | `svelte-check` type checking                  |
| `pnpm lint`    | Prettier + ESLint                             |
| `pnpm format`  | Format with Prettier                          |

## Deployment (Vercel)

The app uses `@sveltejs/adapter-vercel` with the runtime pinned to
`nodejs22.x` in `svelte.config.js`. Import the repo into Vercel, set the
environment variables above, and deploy — Vercel runs `pnpm build`
automatically. Convex is deployed separately via `npx convex deploy`.

> Note: a local `pnpm build` on Windows may fail at the adapter's final
> symlink step (`EPERM`); this is a Windows-only limitation and does not
> affect builds on Vercel's Linux environment.
