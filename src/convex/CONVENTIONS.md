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
- Store functions live in `store/` (`store/admin/` for admin functions); shared, non-registered
  store helpers in `model/store/` (access guards, `adjustStock`, slugs and search text, class
  numbers, placeholder business values). The old store's code is in `legacy/`, kept for good.
- Convex tests are `*.test.ts`; store tests use the harness in `store/harness.testutils.ts`
  (a signed-out caller, two customers and an admin, as real Better Auth rows).

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
  state .

## User identity is a string, there is no `users` table

- Better-auth owns the user records (in its component tables), so the app schema
  has **no `users` table**. Do **not** use `v.id('users')` / `Id<'users'>` — it
  does not exist here.
- Store the owner of a row as **`userId: v.string()`** holding `user._id`
  (see `carts`, `orders`, `addresses`). Index it with `by_userId` and scope
  every per-user query through that index.
- Ownership checks compare `row.userId === user._id`, and refuse with the same message whether
  the row is missing or someone else's.

## Roles & authorization

- Store staff are the template's **app admins**: the Better Auth `role` field is `admin`,
  or the user's id is listed in the `ADMIN_USER_IDS` Convex env var (how the first admin is
  set up). Admins are managed on the `/admin` page. There is no `userRoles` table.
- Every store function calls exactly one guard from `model/store/access.ts`: `requireCustomer`
  or `requireAppAdmin` (admin functions, first thing in the handler), or says in a comment that
  it is deliberately public. UI checks (`useIsAppAdmin()`, `myRoles`) are UX only.
- Never accept a role or `userId` as a function arg for authorization — always
  derive it server-side from `safeGetAuthUser`.

## Money, stock and settings

- All monetary values are **integer paise** (e.g. ₹50 = `5000`). GST rates are
  **basis points** (18% = `1800`). Never use floats for money.
- Price and stock live on **`productVariants`**, never on `products`. Stock is written only by
  `adjustStock` (`model/store/stock.ts`), which logs every change in `stockAdjustments`.
- Business values not yet decided are placeholder constants in `model/store/storeProfile.ts`
  (each TODO (dictate)); the seed copies them into the single `storeSettings` row.

## Products: searchText & slugs are derived — keep them in sync

- `products.searchText` backs the `search_text` index. Rebuild it with `buildSearchText(...)`
  (`model/store/catalog.ts`) on every product insert or update.
- `products.slug` is generated once with `slugify()` + `reserveUniqueSlug()` and **never
  changed**: product URLs depend on it.

## Enums live in store/validators.ts

Reuse the exported validators (`productKind`, `orderStatus`, `gstRate`, `stockReason`, …)
instead of re-declaring literal unions. The full model is in
`.agents/skills/store-app/references/data-model.md`.
