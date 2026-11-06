---
name: store-app
description: Build or change the shop side of Aggarwal Kart (aggarwalkart.in), an online bookstore that sells school book sets by class, plus NCERT, sample-paper, entrance-exam and language books. Covers the catalogue and search, school pages and class sets, cart and checkout, Razorpay online payment, orders, shipping by courier, admin products, stock and import, set management, GST invoices and packing slips, the Product On Demand enquiry form, store settings, and the move off the old WooCommerce site. Use whenever the user mentions books, schools, class lists, sets or bundles, cart, checkout, orders, stock, invoices, shipping, courier, Razorpay, enquiries, the dashboard or admin screens, or the rebuild, even if they don't say "store" or name this skill. Not for sign-in, OTP or email verification (see docs/03, 06, 07).
---

# Store app

Aggarwal Kart is a real business (Aggarwal Books And Stationery Mart, Faridabad) with a live site we are
replacing. The app has two audiences:

- **Customers**, mostly parents buying a whole class set for a child, often on a phone. Some buy single
  books (NCERT, sample papers, entrance exams).
- **The admin** (the owner and staff) keeps the catalogue, sets and stock right, works orders, ships
  them by courier, issues GST invoices and answers "Product On Demand" enquiries.

There are no delivery partners: orders ship by courier across India.

This skill exists so every session builds the same shop the same way. The store is rebuilt **step by
step**; each step replaces the matching old module in `src/convex/` and `src/` and deletes it. The rules
are short because each one prevents a specific, expensive mistake; the references hold the detail.

## Read first

1. `src/convex/_generated/ai/guidelines.md`. Its Convex rules override what you remember.
2. `references/store-profile.md`: the facts about _this_ store and its status. Anything marked
   `TODO (dictate)` hasn't been decided. Don't invent a value: put it in one named constant, say so in
   your report, and ask when it matters (fees, GST, set contents).
3. `references/roles-and-access.md`: who may call what. Read it before writing any function.
4. Before any screen: `references/design.md`.
5. Then the side you're building: `references/customer.md`, `admin.md` or `shipping.md`; `payments.md`
   for step 6; `data-model.md` when adding or changing tables.

## Build order

The roadmap, with what each step builds, retires and needs from the client, is in
`references/store-profile.md` → **Roadmap**, and what is done is under **Status**. Work on the first
step not marked **built**: one branch and one draft PR per step. In short: 1 base (tables, guards,
seed, move the old store to `legacy/`), 2 catalogue, 3 school sets, 4 cart, 5 checkout and orders,
6 Razorpay, 7 admin, 8 invoices, 9 Product On Demand, 10 policies, SEO and launch.

## Rules and why

- **Money is integer paise**, everywhere, including the database. Format only at the edge with
  `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`. GST rates are basis points
  (18% = 1800). Prices include GST; tax is back-calculated. Floats drift and a ₹0.01 gap between the
  screen and the invoice becomes a dispute.
- **The server recomputes prices and checks stock at checkout.** The client's cart is a request, not a
  fact. Reuse `calculateOrder` / `loadSettings` from `src/convex/lib/` until step 5 moves them.
- **A set is a list of products, not one priced product.** Its price is the sum of its lines at
  checkout, and the order snapshots each line, so the invoice shows real books with their HSN and GST.
- **Sets belong to an academic session** (e.g. 2026-27). Next year's list never edits last year's orders.
- **Every store function calls exactly one access guard** (public, customer or admin) and takes no
  `userId` argument. UI gating hides things; the guard is the security boundary.
- **Stock changes go through one helper** that also writes a `stockAdjustments` row. When the shelf and
  the app disagree, that log is the only way to find out why.
- **Orders snapshot names, prices, HSN and tax** into `orderItems`. Editing a product later must not
  rewrite old orders or invoices.
- **Only the gateway marks an order paid** (signed webhook or server-side status check), never the
  browser (`references/payments.md`).
- **Public queries return only what a customer needs.** No purchase price, no exact stock beyond a
  "few left" threshold, nothing about other users.
- **Queries are bounded** (`.take()` or pagination) and use indexes. The orders table only grows.
- **"Today" is India time (IST, UTC+5:30).** Queries can't read the clock; mutations may use `Date.now()`.
- **The repo is public.** Phone, email, GSTIN, UPI id and street address are never written in the repo:
  they live in the `storeSettings` row, typed into `/admin/settings`.
- **Design for a cheap Android phone on slow 4G**: small lazy images with fixed aspect ratios, no heavy
  libraries, large tap targets, skeletons instead of spinners, nothing that needs hover.
- **All UI text lives in `src/lib/store/strings.ts`** so Hindi can be added without touching components.
- **Use the store's own name, colours, copy and layout.** Don't copy another retailer's branding.
- **The live site's content in the hims + Apple design language.** Every screen follows
  `references/design.md`: structure and content from aggarwalkart.in, look from `legacy/` pushed
  toward hims and Apple, and all code new. Never import from `legacy/`. hims and Apple are references
  for feel, never for branding.

## Where code goes

| What                                                  | Where                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| Tables, validators                                    | `src/convex/schema.ts`, `src/convex/store/validators.ts`             |
| Customer functions                                    | `src/convex/store/{catalog,sets,cart,addresses,orders,enquiries}.ts` |
| Admin functions                                       | `src/convex/store/admin/*.ts`                                        |
| Pure helpers (pricing, time, invoices, access guards) | `src/convex/model/store/*.ts`                                        |
| Components, cart state, strings                       | `src/lib/store/*`                                                    |
| Routes                                                | `src/routes/` (customer), `src/routes/admin/*`                       |

## The old store (`legacy/`)

Step 1 moves the old store out of `src/` into `legacy/`, which nothing builds, type-checks or deploys,
because its tables use the same names as the new ones. Each later step reads the old code there, ports
what is worth keeping, and deletes those files, so `legacy/` is empty by step 10. Worth porting rather
than rewriting: the pdfmake invoice and packing slip (`legacy/src/lib/pdf/`, `legacy/src/convex/lib/orderDocument.ts`),
the stock-sheet parser (`legacy/src/lib/products/import.ts`), the GST maths (`legacy/src/convex/lib/pricing.ts`),
`slugify` and `reserveUniqueSlug`, and the URL filter state (`legacy/src/lib/shop/filters.svelte.ts`).
Before step 1 these are still at the same paths without `legacy/`.

Reuse before writing: `authComponent.getAuthUser` / `safeGetAuthUser` (`src/convex/auth.ts`),
`requireAppAdmin` (`src/convex/model/admin/index.ts`), `src/lib/ui` and the primitives in
`src/lib/primitives/ui/`, `optimizeImage`, `gotoApp`, `@convex-dev/rate-limiter` (already mounted). New
routes are private unless added to `isPublic` in `src/hooks.server.ts`.

## Finish

- `pnpm check` and `npx tsc -p src/convex --noEmit` pass.
- If you touched access rules, prove them: a Vitest refusal per role through the shared harness
  (`src/convex/store/harness.testutils.ts`, built in step 1). Only tests that can fail when the
  behaviour breaks.
- Update the **Status** section of `references/store-profile.md`.
- Report what you built, which `TODO (dictate)` values you assumed, and anything you left for later.
