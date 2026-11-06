# Deployment & production readiness

How to take Aggarwalkart from local dev to a live site, and the gaps to close
before taking real orders. The app has **two backends to deploy**: the SvelteKit
frontend (Vercel) and the Convex backend (Convex cloud).

## The dev → prod model

| Environment | Frontend          | Backend                          |
| ----------- | ----------------- | -------------------------------- |
| Local       | `vite dev`        | `convex dev` (dev deployment)    |
| Preview     | Vercel preview    | Convex dev/preview deployment    |
| Production  | Vercel production | Convex **production** deployment |

`convex dev` and `convex deploy` target _different_ deployments. Production data,
env vars, and secrets are separate from dev — set them per deployment.

## 1. Deploy Convex with the frontend (recommended)

Wire Convex into the Vercel build so the backend deploys and the frontend gets
the right `CONVEX_URL` automatically. In the Vercel project settings:

- **Build Command:** `npx convex deploy --cmd 'pnpm build'`
- **Environment variable:** `CONVEX_DEPLOY_KEY` = a _production_ deploy key from
  the Convex dashboard (Project → Settings → Deploy keys).

`convex deploy --cmd` pushes the backend, then runs `pnpm build` with
`PUBLIC_CONVEX_URL` injected for the production deployment.

## 2. Environment variables

Secrets live in **two** places. Never commit them (see `.env.example` for local).

### Vercel (frontend / build)

| Variable                 | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `CONVEX_DEPLOY_KEY`      | Lets the build deploy + target prod Convex |
| `PUBLIC_CONVEX_URL`      | Set automatically by `convex deploy --cmd` |
| `PUBLIC_CONVEX_SITE_URL` | Convex site URL (auth proxy target)        |

### Convex (backend functions — set in the Convex dashboard)

| Variable                                    | Used by                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `SITE_URL`                                  | Better Auth `baseURL` (`auth.ts`) — must be your real production URL                               |
| `RESEND_API_KEY`                            | Sending OTP / transactional email                                                                  |
| `EMAIL_FROM`                                | OTP sender address — must be on a Resend-verified domain (not the `onboarding@resend.dev` sandbox) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google social login                                                                                |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`   | Real payments (when enabled)                                                                       |

## 3. Pre-launch checklist (close these before real orders)

Ordered by importance.

1. **Enable real payments.** `src/components/app/app-initialize.svelte` currently
   wires `MockPaymentProcessor` — checkout completes **without charging**. Switch
   to `ConvexPaymentProcessor` (backed by the Razorpay action) and add **server-side
   payment verification** (Razorpay signature / webhook) before trusting a payment.
   Today `confirmOrder` is called client-side right after the mock "charge."
2. **Seed the `settings` table** in production. Pricing falls back to
   `DEFAULT_SETTINGS` otherwise; run the seed from `src/convex/seed.ts` and confirm
   the client's real GST/shipping numbers.
3. **Use a verified email domain.** `auth.ts` sends from `EMAIL_FROM` (falling
   back to Resend's sandbox `onboarding@resend.dev`, which only delivers to your
   own account email). Verify a domain you own in Resend, then set `EMAIL_FROM`
   to an address on it (e.g. `verify@yourdomain.com`) on each Convex deployment,
   or OTP/verification mail won't reach real users. Email sign-in is now gated on
   verification (`requireEmailVerification: true`), so unverified users can't sign in.
4. **Harden auth.** Set the production `SITE_URL` and configure Google OAuth prod
   credentials + redirect URIs. Email verification is already required
   (`requireEmailVerification: true`); OAuth-only users can add a password from
   the profile page (`setMyPassword`).
5. **Verify roles.** Ensure the right admin emails exist in `userRoles` so the
   dashboard is reachable by you and locked for everyone else.
6. **GST-compliant invoice numbering.** The invoice/packing-slip PDFs
   (`src/lib/pdf/`, data from `src/convex/lib/orderDocument.ts`) currently use the
   order's short id for both "Invoice Number" and "Order Number". A legal GST
   invoice needs a **unique sequential** number per financial year — add an
   `orders.invoiceNumber` field + an atomic counter assigned at `confirmOrder`,
   and render that on the invoice.
7. **Snapshot recipient details onto the order.** The order stores only an
   `addressId` (no recipient name/phone) and there's no customer-notes field, so
   the invoice falls back to the account name and the packing slip shows the
   address only — and both can change if the user later edits their profile.
   Capture name + phone (+ optional notes) at checkout so documents stay accurate
   and immutable. See `assembleOrderDocument` / `getOrderDocument`.

> **Indexes:** the shop's filter/sort uses the `by_category_price` and
> `by_salePrice` indexes on `products`. They're declared in `schema.ts`, so
> `npx convex deploy` creates + backfills them automatically — no manual step.

### Nice-to-haves (not blockers)

- **Shop card / UX polish.** The product cards are minimal. Add an MRP
  strikethrough and a discount badge (data is there: `maxRetailPrice` vs
  `salePrice`), skeleton loading, a result count, and proper empty states.
- **Customer "shop by school / grade" flow.** The data exists (`schools`,
  `bundles`, `getSchoolProducts`) but there's no customer-facing bundle browse
  yet.
- **Real logo on the PDFs.** The invoice/packing-slip letterhead embeds
  `favicon.svg` as a placeholder (`LOGO_SVG` in `src/lib/pdf/shared.ts`) — swap in
  the Aggarwalkart logo.
- **Sorted-search cap.** `products.listShopProducts` ranks the top **200**
  relevance matches before sorting them by price (Convex can't `.order()` a search
  index). Fine for this catalog; raise the cap if search terms get very broad.
- **Remove now-unused code:** the `paneforge` dependency (`pnpm remove paneforge`),
  the `playwright` dev dependency if you don't want it, and the superseded
  `getProductsThatAre` / `searchProductsPaginated` Convex queries (the loaders use
  `listShopProducts` now).
- **Navbar clearance is a fixed guess.** `/shop` content uses `pt-24` to clear the
  floating navbar pill; revisit if the pill wraps to two lines on narrow widths.

## 4. After launch

- **Logs / errors:** Convex function logs live in the Convex dashboard; Vercel
  logs cover the frontend. Consider a frontend error monitor (e.g. Sentry) later.
- **Updates:** Dependabot (`.github/dependabot.yml`) opens grouped dependency PRs
  monthly; CI (`.github/workflows/ci.yml`) gates every PR on lint, type-check,
  tests, and build.
- **Preview deploys:** each PR gets a Vercel preview. Point previews at a
  non-production Convex deployment so test traffic never touches live data.

## Quick deploy steps

1. Push the repo to GitHub.
2. Import it into Vercel; set the build command and env vars above.
3. Add Convex backend env vars in the Convex dashboard.
4. Deploy. Work through the pre-launch checklist before announcing the store.
