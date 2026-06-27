# Project Convex conventions

Project-specific rules for this codebase. These **extend and, where noted,
override** the generic guidelines in `_generated/ai/guidelines.md`. That
generated file is rewritten by `npx convex ai-files install` — never edit it.
Edit **this** file instead (it is not generated).

## Layout & imports

- Convex functions live in **`src/convex/`** (configured in `convex.json`), not
  `convex/`. Tables are defined in `src/convex/schema.ts`.
- Relative imports use explicit **`.js` extensions**:
  `import { query, mutation } from './_generated/server.js'`. Match this in new
  files — `./_generated/server` without `.js` is wrong here.
- Shared, non-registered helpers live in `src/convex/lib/` (`pricing.ts`,
  `settings.ts`) and top-level helper modules (`slugs.ts`, `productSearch.ts`).

## Authentication — better-auth, NOT raw JWT

This project uses **`@convex-dev/better-auth`** (wired in `convex.config.ts` and
`auth.ts`). The generic guideline advice about `ctx.auth.getUserIdentity()`,
`tokenIdentifier`, and `ConvexProviderWithAuth` does **not** apply.

- Get the current user inside any query/mutation/action with:
  ```ts
  import { authComponent } from './auth.js';
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error('Not authenticated'); // or `return []` / `return null`
  ```
- The stable user key is **`user._id`** (a better-auth id, type `string`). The
  matching auth config provider comes from `auth.config.ts`.
- Public, auth-optional queries should **return empty (`[]`/`null`) instead of
  throwing** when `safeGetAuthUser` is null, so the UI can render a signed-out
  state (see `addresses.getMyAddresses`).

## User identity is a string, there is no `users` table

- Better-auth owns the user records (in its component tables), so the app schema
  has **no `users` table**. Do **not** use `v.id('users')` / `Id<'users'>` — it
  does not exist here.
- Store the owner of a row as **`userId: v.string()`** holding `user._id`
  (see `cartItems`, `orders`, `addresses`). Index it with `by_userId` and scope
  every per-user query through that index.
- Ownership checks compare `row.userId === user._id` (see
  `orders.confirmOrder`, `addresses.deleteAddress`).

## Roles & authorization

- Roles live in a separate **`userRoles`** table keyed by **email**
  (`by_email` index), values `'admin' | 'developer' | 'customer'`
  (`CUSTOMER_ROLE` in `schema.ts`). A user with no row defaults to `customer`.
- Dashboard/admin functions guard with the helpers in `dashboard.ts`:
  - `requireElevated(ctx)` → allows `admin` or `developer`.
  - `requireAdmin(ctx)` → `admin` only (destructive ops: delete product/school,
    manage users).
    Call the guard first thing in the handler; it returns the user.
- Never accept a role or `userId` as a function arg for authorization — always
  derive it server-side from `safeGetAuthUser`.

## Money & settings

- All monetary values are **integer paise** (e.g. ₹50 = `5000`). GST rates are
  **basis points** (18% = `1800`). Never use floats for money.
- Tunable numbers come from the `settings` table via
  `loadSettings(ctx.db)` (`lib/settings.ts`), which layers DB rows over
  `DEFAULT_SETTINGS`. Order math goes through `calculateOrder()` in
  `lib/pricing.ts` — don't recompute totals/shipping/tax ad hoc.

## Products: searchText & slugs are derived — keep them in sync

- `products.searchText` is a **denormalized** field backing the `search_name`
  full-text index. Whenever you insert or update a product, recompute it with
  `buildSearchText(...)` from `productSearch.ts`. Never write a product without
  it.
- `products.slug` is a **stable** URL slug (`by_slug` index). Generate once on
  insert with `slugify()` + uniqueness via `dbUniqueSlug`/`reserveUniqueSlug`
  (`slugs.ts`). **Never change an existing slug** — product URLs depend on it.
  Backfill missing slugs only (see `dashboard.backfillSlugs`).

## Shop catalog query (`products.listShopProducts`)

The storefront grid (both `/shop` and `/shop/[category]`) is backed by the single
paginated query `listShopProducts`. It picks an **access path per active filter**
so each maps to an index:

- text search (`q`) → `search_name` full-text index (with `category` as a filter
  field);
- price sort or price range → `by_category_price` / `by_salePrice` index, walked
  in price order with `.gte`/`.lte` bounds;
- otherwise → `by_category` (or whole table) in creation order.

`in-stock` is a `stock > 0` `.filter()` on top. A search index **can't be
`.order()`'d**, so when a search is combined with an explicit sort the query
collects the top matches (`SEARCH_CAP`), filters + sorts in memory, and paginates
by a **numeric-offset cursor** (returns a hand-built `PaginationResult`). Filters
are URL state on the client (`src/lib/shop/`), so the loaders just parse the query
string into these args.

## Documents (invoice + packing slip)

Both PDFs render from **one** server-built model: `assembleOrderDocument(ctx,
order, customer)` in `lib/orderDocument.ts`. Line prices come from
`purchases.priceAtPurchase`; shipping/total come from the **stored** order (so the
document reflects what was charged); the GST split is back-calculated via
`calculateOrder`. The customer's invoice goes through `orders.getOrderInvoice`
(owner-guarded); the dashboard's copies through `dashboard.getOrderDocument`
(`requireElevated`). The client renderers live in `src/lib/pdf/` — keep them
presentation-only; all amounts are decided server-side.

## Enums live in schema.ts

Reuse the exported validators instead of re-declaring literal unions:
`CUSTOMER_ROLE`, `ORDER_STATUS`, `TRACKING_STATUS`, `TAX_CATEGORY`.

## Domain notes

- Orders use a status state machine (`ORDER_STATUS`); `tracking` events
  (`TRACKING_STATUS`) drive `order.status` via the map in
  `dashboard.pushTrackingEvent`. Stock is decremented in `orders.createOrder`.
- Payment is currently **mocked** (`orders.createPaymentOrder` returns a fake
  order id) — checkout is "client-agnostic" pending a real gateway.
