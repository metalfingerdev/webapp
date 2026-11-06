# Security Review — Convex Functions

**Date:** 2026-06-27
**Scope:** All Convex functions in `src/convex/` (queries, mutations, actions).
**Reviewer:** automated sweep for broken access control, IDOR, missing auth,
client-trusted identifiers, and admin-guard coverage.

## TL;DR

The **admin surface (`dashboard.ts`) was already solid** — every function is
behind `requireElevated` / `requireAdmin`. The problems were all in the
customer-facing files, where auth was either skipped entirely or a `userId` was
trusted from the client. Three were serious (one critical). All listed fixes
below have been applied; one item (payments) is documented as a known
pre-launch requirement because it can't be truly fixed without a real gateway.

Reminder about the threat model: in Convex, **every `query` / `mutation` /
`action` that is not `internal*` is publicly callable** by anyone who has the
deployment URL. A login-gated _page_ does **not** protect the function behind
it. Authorization must live inside each function.

---

## Fixed

### 1. 🔴 CRITICAL — Anyone could delete any product

- **Where:** `src/convex/products.ts` — `deleteProduct`
- **Problem:** A public `mutation` with no auth check that deleted a product by
  id. Product ids are present throughout the public HTML (product pages, cart,
  search), so an unauthenticated attacker could enumerate them and wipe the
  entire catalog.
- **Fix:** **Deleted the function entirely.**
- **Why this fix (and not "add an admin guard"):** It was **dead, duplicated
  code**. The dashboard never called it — it calls `dashboard.ts` →
  `removeProduct`, which is already correctly guarded by `requireAdmin`. Adding a
  guard would have kept a redundant second deletion path alive (two things to
  keep in sync, two things to get wrong later). The most secure code is code
  that doesn't exist: removing the duplicate eliminates the vulnerability _and_
  the future footgun. A short comment now points readers to the canonical
  guarded path.

### 2. 🔴 HIGH — Order invoices leaked customer PII (IDOR)

- **Where:** `src/convex/orders.ts` — `getOrderInvoice`
- **Problem:** Public query, no authentication and no ownership check. Given any
  `orderId` it returned the order, line items, and the **shipping address**
  (street, city, pincode). Classic Insecure Direct Object Reference — anyone
  could read any customer's order + address by supplying an id.
- **Fix:** Require an authenticated session and assert `order.userId ===
user._id` before returning anything.
- **Why this fix:** It makes `getOrderInvoice` consistent with the _correct_
  sibling already in the codebase, `profile.ts` → `getMyOrder`, which does
  exactly this. Reusing the established, proven pattern (rather than inventing a
  new check) keeps the two order-reading paths behaving identically and easy to
  reason about. I scoped it to the **owner only** (not "owner or admin") because
  admins already have their own dedicated reader, `dashboard.ts` → `getOrder`,
  behind `requireElevated`; widening this customer endpoint to admins would blur
  that boundary for no benefit. Not-found still returns `null` (so the page
  renders gracefully); an ownership mismatch throws `Unauthorized.`

### 3. 🔴 HIGH — The entire cart trusted a client-supplied `userId`

- **Where:** `src/convex/cart.ts` — `getCart`, `mergeGuestCart`,
  `updateQuantity`, `clearCart`
- **Problem:** Every function took `userId: v.string()` and the client literally
  passed its own id (`auth.getUserId()`). The server never verified it, so
  swapping in another user's id let an attacker **read, modify, or wipe any
  user's cart**. This also directly violates the project's own rule in
  `src/convex/_generated/ai/guidelines.md`: _"NEVER accept a `userId` … as a
  function argument for authorization purposes. Always derive the user identity
  server-side."_
- **Fix:** Removed the `userId` argument from all four functions and derive the
  owner server-side via `authComponent.safeGetAuthUser(ctx)`. Updated the client
  to stop sending it:
  - `src/lib/cart/types.ts` — dropped `userId` from the mutation arg types.
  - `src/lib/cart/state.svelte.ts` — calls no longer pass `userId`.
  - `src/lib/cart/service.svelte.ts` — `getCart` is now called with `{}` (still
    `'skip'` when unauthenticated).
- **Why this fix (and not "validate the userId matches the session"):** You
  _could_ keep the argument and check `args.userId === user._id`, but then the
  parameter is pure dead weight — the server already knows who the caller is from
  the auth token, so the client should never be in the business of asserting its
  own identity. Removing the parameter makes misuse **impossible by
  construction** rather than caught by a check someone could later forget to
  copy into a new function. Guest carts are unaffected: they remain entirely
  client-side in `localStorage`, and only `mergeGuestCart` (which now runs as the
  authenticated user) writes them to the DB on login.

### 4. 🟠 MEDIUM — `createOrder` didn't verify the address belongs to the buyer

- **Where:** `src/convex/orders.ts` — `createOrder`
- **Problem:** The mutation stamped the client-supplied `addressId` onto the new
  order without checking it belonged to the caller. A user could attach an
  arbitrary (or another user's) address to their order.
- **Fix:** Load the address and assert `address.userId === user._id` before
  creating the order.
- **Why this fix:** Pricing was already computed server-side and stock was
  already validated, so the address was the one remaining client input trusted
  without verification. The check is the same ownership pattern used everywhere
  else for `addresses` (see `addresses.ts` / `profile.ts`), so it's consistent
  and cheap (one `ctx.db.get`). This also closes a compounding risk: pairing a
  spoofed address with the (now-fixed) invoice leak.

### 5. 🟡 LOW — Public test endpoints (needless attack surface)

- **`src/convex/auth.ts` — `getPublicData`:** removed. It was scaffolding that
  returned a static string; dead public surface with zero value.
- **`src/convex/emails.ts` — `sendTestEmail`:** changed from `action` to
  `internalAction`.
- **Why `internalAction` instead of deletion here:** Unlike `getPublicData`, a
  test-email helper is genuinely useful during development — but as a public
  `action` _anyone_ could trigger it to send mail and burn Resend quota (a cheap
  abuse/billing vector). `internalAction` keeps it runnable from the Convex
  dashboard / other server functions (admin-only) while making it
  **uncallable from the public client**, which removes the abuse vector without
  throwing away a useful tool.

---

## Known / Accepted (not silently "fixed")

### A. ⚠️ Payments are mocked — `confirmOrder` trusts the client's `paymentId`

- **Where:** `src/convex/orders.ts` — `createPaymentOrder` (returns a mock
  `order_mock_…` id) and `confirmOrder`.
- **Status:** `confirmOrder` already checks ownership and that the order is
  `pending`, so there is **no cross-user abuse**. However, it accepts any
  `paymentId` string and never verifies it against a payment gateway — so a user
  can mark _their own_ pending order "confirmed" without actually paying.
- **What I did:** Added an explicit `⚠️ SECURITY` comment and a minimal
  non-empty guard on `paymentId`. I deliberately did **not** fake a stronger
  check, because anything short of real gateway verification would be security
  theater that hides the gap.
- **What's required before taking real money:** verify the payment server-side —
  e.g. validate the Razorpay signature / capture the order against the gateway
  inside `confirmOrder` (or, better, confirm via a gateway **webhook** to an
  `httpAction`, not a client-initiated mutation) — instead of trusting the
  string from the browser.

### B. ℹ️ `accountForEmail` is intentional account enumeration

- **Where:** `src/convex/auth.ts` — `accountForEmail`
- **Status:** **By design** (documented in the function). It lets the signup form
  route an existing email to its real method ("continue with Google") instead of
  silently failing — the common consumer-app tradeoff. The cost is that anyone
  can probe whether an email is registered and which providers it uses.
- **Recommendation:** Acceptable if deliberate, but consider rate-limiting it to
  blunt bulk enumeration. Left as-is per the existing intent.

### C. ℹ️ `validateCartStock` is a read-only `mutation`

- **Where:** `src/convex/products.ts` — `validateCartStock`
- **Status:** It's a `mutation` that performs no writes (it only reads stock and
  throws on shortfall). Stylistically it should be a `query`, but it has **no
  security impact** (the only data it surfaces — stock counts — is already public
  via the catalog).
- **Why left as-is:** It's invoked imperatively during checkout via
  `useMutation(...)`. Converting it to a `query` would require reworking the call
  site to an imperative `convex.query(...)` for no security gain. Not worth the
  churn during a security pass; noted for a future cleanup.

### D. 🧹 Vestigial `getUserId`

- After fix #3, `AuthService.getUserId()` (`src/lib/cart/types.ts`, provided by
  `app-initialize.svelte`) is no longer used. It's harmless to leave, but can be
  removed in a follow-up tidy-up.

---

## Verdict

Not "a hacker's wet dream" overall — the role/admin model is genuinely good. But
the three red findings (catalog wipe, PII leak, cart IDOR) were exactly the
"silly mistake" class of bug and **had to be fixed before going public**. They
now are. The biggest remaining risk is **payments**, which is correctly mocked
today and flagged loudly for launch.
