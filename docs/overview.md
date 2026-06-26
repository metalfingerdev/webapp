# Aggarwalkart — Overview

A short, general map of what this app is and how the pieces fit together. Start
here, then dive into the code or [deployment.md](./deployment.md) for going live.

## What it is

Aggarwalkart is an e-commerce storefront (books, clothes, stationery, school
bundles) with a customer-facing shop, a cart/checkout flow, user accounts, and
an admin dashboard for managing products and stock.

## Tech stack

| Layer    | Choice                                                                        |
| -------- | ----------------------------------------------------------------------------- |
| Frontend | SvelteKit (Svelte 5 runes), Tailwind CSS v4, bits-ui, paneforge               |
| Backend  | Convex (serverless functions + reactive database)                             |
| Auth     | Better Auth via `@convex-dev/better-auth` (email/password, email OTP, Google) |
| Email    | Resend (OTP / transactional)                                                  |
| Payments | Razorpay (behind a swappable `PaymentProcessor` interface)                    |
| Hosting  | Vercel (`@sveltejs/adapter-vercel`, Node 22) + Convex cloud                   |

## How a request flows

```
Browser ──> SvelteKit (Vercel, SSR + client)
                │
                ├─ $lib/sveltekit  → reads auth token, talks to Convex over HTTP during SSR
                ├─ /api/auth/*      → proxies Better Auth requests to the Convex site URL
                │
                └─ convex-svelte    → live reactive queries/mutations to Convex (client)
                                          │
                                          └─ src/convex/*  (functions, auth, payments, email)
```

- **SSR + hydration:** server load functions fetch from Convex via
  `createConvexHttpClient`; the client then takes over with live subscriptions.
- **Auth:** `$lib/svelte` and `$lib/sveltekit` bridge SvelteKit and Convex Better
  Auth (token cookie, SSR auth state, and the `/api/auth` proxy). These are
  load-bearing — the app depends on them.

## Directory map

```
src/
  routes/            SvelteKit pages & endpoints
    (app)/           the storefront: home, shop/[category]/[slug], cart, user, dashboard
    api/auth/        Better Auth handler (proxied to Convex)
    sitemap.xml/     generated sitemap
  components/        UI: navbar, sidebar, checkout, shop, app shell
  lib/
    cart/            cart state, checkout orchestration (processCheckout)
    products/        stock-sheet import parsing
    razorpay/        PaymentProcessor + Mock/Convex implementations
    svelte/ sveltekit/  Convex Better Auth adapter (load-bearing)
  convex/            backend functions + schema
    lib/             pricing.ts (GST/money), settings.ts
    schema.ts        tables: products, orders, addresses, cartItems, settings, userRoles, …
    auth.ts          Better Auth config (Resend, Google, OTP)
docs/                this documentation
```

## Key concepts worth knowing

- **Money is integer paise; GST rates are basis points** (1800 = 18%). All order
  math goes through `calculateOrder` / `loadSettings` in `src/convex/lib/` — never
  ad-hoc arithmetic. Stored prices are **GST-inclusive**; tax is back-calculated.
- **Pricing settings** live in the `settings` table (overriding `DEFAULT_SETTINGS`).
  The seed values are in `src/convex/seed.ts` and must be seeded per deployment.
- **Roles** live in the `userRoles` table (by email). Admin/dashboard functions are
  guarded by `requireElevated` / `requireAdmin` (`src/convex/dashboard.ts`).
- **No `users` table** — owners are stored as `userId: v.string()` (the Better Auth
  user id), not a Convex `Id<'users'>`.
- **Payments are abstracted** behind `PaymentProcessor`. A `MockPaymentProcessor`
  is wired today (no real charges); switching to real Razorpay is a deployment step.

## Conventions

Backend conventions and where this repo deviates from generic Convex guidance are
documented in [`src/convex/CONVENTIONS.md`](../src/convex/CONVENTIONS.md). Read it
before touching backend code.

## Local development

See the [README](../README.md) for setup. In short: `pnpm install` then `pnpm dev`
(runs the SvelteKit frontend and `convex dev` together).
