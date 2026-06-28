# Aggarwalkart — Overview

A short, general map of what this app is and how the pieces fit together. Start
here, then dive into the code or [deployment.md](./deployment.md) for going live.

## What it is

Aggarwalkart is an e-commerce storefront (books, clothes, stationery, school
bundles) with:

- a customer-facing **shop** with URL-driven filtering, sorting and full-text
  search, a category browse, and product pages;
- a **cart + checkout** flow (guest cart in `localStorage`, merged on login);
- **user accounts** (profile, addresses, order history, downloadable invoices);
- an **admin dashboard** for products, schools/bundles, orders, stock and
  fulfilment (invoice + packing-slip PDFs);
- a shared **navbar** (expanding search panel) and a **sidebar**
  with hims.com-style drill-down views.

## Tech stack

| Layer    | Choice                                                                        |
| -------- | ----------------------------------------------------------------------------- |
| Frontend | SvelteKit (Svelte 5 runes), Tailwind CSS v4                                   |
| Backend  | Convex (serverless functions + reactive database)                             |
| Auth     | Better Auth via `@convex-dev/better-auth` (email/password, email OTP, Google) |
| Email    | Resend (OTP / transactional)                                                  |
| Payments | Razorpay (behind a swappable `PaymentProcessor` interface) — **mocked today** |
| PDFs     | pdfmake (invoice + packing slip), lazy-loaded client-side                     |
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

- **SSR + hydration:** server `load` functions fetch from Convex via the HTTP
  client; the client then takes over with live subscriptions. The shop grid uses
  `convexLoadPaginated`, so it SSRs and stays a live paginated subscription.
- **Auth:** `$lib/svelte` and `$lib/sveltekit` bridge SvelteKit and Convex Better
  Auth (token cookie, SSR auth state, and the `/api/auth` proxy). These are
  load-bearing — the app depends on them.

## Directory map

```
src/
  routes/
    (app)/
      (home)/                home
      shop/                  catalog: +layout (filter rail) + grid; [category]/[slug]
      user/                  profile, addresses, orders; [order] = invoice page
      dashboard/             admin console (+page.server.ts gates non-admins)
    api/auth/                Better Auth handler (proxied to Convex)
  components/
    navbar/                  bar + row + search panel + mega menu
    sidebar/                 drawer with drill-down views (menu, category, cart, auth, user)
    shop/                    filters-sidebar (desktop) + filters-bar (mobile)
    dashboard/               shadcn-style admin kit: ui/, stat-cards, shell, products/ schools/ orders/
    checkout/  app/          checkout modal, app shell
  lib/
    cart/                    cart state + checkout orchestration (processCheckout)
    shop/                    filters.svelte.ts (URL-backed) + query-params.ts
    dashboard/               dashboard.svelte.ts (context: shared queries/mutations)
    pdf/                     invoice + packing-slip builders (pdfmake), shared helpers
    navbar/  sidebar/        navbar + sidebar context services
    razorpay/                PaymentProcessor + Mock/Convex implementations
    products/                stock-sheet import parsing
    svelte/  sveltekit/      Convex Better Auth adapter (load-bearing)
  convex/                    backend functions + schema
    lib/                     pricing.ts (GST/money), settings.ts, orderDocument.ts (PDF data)
    schema.ts                products, orders, addresses, cartItems, settings, userRoles, schools, bundles, …
    products.ts              public catalog + listShopProducts (filter/sort/search)
    dashboard.ts             admin functions (requireElevated / requireAdmin)
    auth.ts                  Better Auth config (Resend, Google, OTP)
docs/                        this documentation
```

## Key concepts worth knowing

- **Money is integer paise; GST rates are basis points** (1800 = 18%). All order
  math goes through `calculateOrder` / `loadSettings` in `src/convex/lib/` — never
  ad-hoc arithmetic. Stored prices are **GST-inclusive**; tax is back-calculated.
- **Pricing settings** live in the `settings` table (overriding `DEFAULT_SETTINGS`).
  Seed values are in `src/convex/seed.ts` and must be seeded per deployment.
- **Roles** live in the `userRoles` table (by email). Admin/dashboard functions are
  guarded by `requireElevated` / `requireAdmin` (`src/convex/dashboard.ts`).
- **No `users` table** — owners are stored as `userId: v.string()` (the Better Auth
  user id), derived server-side, never accepted as a client argument.
- **Shop filters are URL state.** `src/lib/shop/filters.svelte.ts` reads/writes the
  query string; changing a filter re-runs the loader, which calls
  `products.listShopProducts` (index-backed filter/sort + full-text search).
- **Documents** (invoice + packing slip) share one data model
  (`convex/lib/orderDocument.ts`); the client renders them with pdfmake
  (`src/lib/pdf/`).
- **Payments are abstracted** behind `PaymentProcessor`. `MockPaymentProcessor`
  is wired today (no real charges) — see the pre-launch checklist.

## Project status — what's done / what's left

**Working:** shop browse + category + search, URL-driven filters/sort, cart +
guest-merge, checkout (mock payment), accounts/addresses/orders, admin dashboard
(products/schools/bundles/orders/stock), invoice + packing-slip PDFs, role-gated
admin, security pass on Convex functions (see [SECURITY.md](../SECURITY.md)).

**Left before / shortly after launch** — the authoritative, detailed list is the
**[pre-launch checklist](./deployment.md#3-pre-launch-checklist-close-these-before-real-orders)**.
In brief:

- **Blockers:** real Razorpay + server-side payment verification; seed `settings`
  in prod; verified email domain; GST-compliant sequential invoice numbers;
  snapshot recipient name/phone/notes onto orders.
- **Nice-to-haves:** shop card/UX polish (MRP strikethrough, discount badge,
  skeletons, result count, empty states); a customer-facing "shop by school /
  grade" bundle flow; real logo on the PDFs; remove now-unused deps/queries.

## Conventions

Backend conventions and where this repo deviates from generic Convex guidance are
documented in [`src/convex/CONVENTIONS.md`](../src/convex/CONVENTIONS.md). Read it
before touching backend code.

## Local development

See the [README](../README.md) for setup. In short: `pnpm install` then `pnpm dev`
(runs the SvelteKit frontend and `convex dev` together).
