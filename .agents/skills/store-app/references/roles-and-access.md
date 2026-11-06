# Roles and access

Read before writing any function. UI checks (hidden buttons, redirects) are UX; the guard inside the
Convex function is the security boundary.

## The guards

| Guard                        | Who                    | Where                                                        |
| ---------------------------- | ---------------------- | ------------------------------------------------------------ |
| none, public projection only | anyone, signed out too | catalogue, sets, school pages, enquiry submit (rate limited) |
| `requireCustomer(ctx)`       | any signed-in user     | cart, addresses, orders, payment start                       |
| `requireAppAdmin(ctx)`       | admins                 | everything under `store/admin/*`                             |

- Put the guards in `src/convex/model/store/access.ts`. `requireCustomer` wraps `authComponent.getAuthUser`;
  `requireAppAdmin` is re-exported from `src/convex/model/admin/index.ts`.
- Every store function calls exactly one guard (or is deliberately public and says so in a comment).
- **No function takes a `userId`, role or email argument for authorization.** Derive it from the session.
- Ownership: `row.userId === user._id`, and refuse with the same message whether the row is missing or
  somebody else's.
- A guest can browse and fill a cart (kept in `localStorage`); it merges on sign-in. Checkout needs sign-in.
- The Razorpay webhook is public but verifies its HMAC signature first, in `src/convex/http.ts`.

## What each role may see

|                                | Public                                                   | Customer | Admin                     |
| ------------------------------ | -------------------------------------------------------- | -------- | ------------------------- |
| Active products, sets, schools | yes, no cost or exact stock                              | same     | all, including hidden     |
| Stock                          | "In stock" or "Only a few left"                          | same     | exact, with the log       |
| Own orders and addresses       | no                                                       | yes      | all orders                |
| Other users' anything          | no                                                       | no       | orders and enquiries only |
| Settings                       | public fields only (name, shipping fee, support contact) | same     | all                       |

## `myRoles`

`src/convex/store/access.ts` exports `myRoles`, returning `{ isSignedIn, isAdmin }` for the header and
user menu. UX only. The template's `useIsAppAdmin()` (`src/lib/admin/api/admin.svelte.ts`) already does
the admin half.

## Route gating

- Public routes go in `isPublic` in `src/hooks.server.ts`: `/`, `/shop{/*rest}`, `/schools{/*rest}`,
  `/product-on-demand`, policy pages, `/sitemap.xml`, `/signin`, `/api/auth{/*rest}`.
- Everything else is private by default: `/cart` can stay public, `/checkout`, `/orders`, `/account`,
  `/admin` are private. A private page opened by client-side navigation also calls `useRequireSignIn()`.
- `/admin` checks `isAdmin` and shows "Access denied" to others.

## Tests worth having

Through the shared harness `src/convex/store/harness.testutils.ts` (convex-test, one helper that makes a
signed-out caller, a customer and an admin):

- signed-out and customer calls to each admin function are refused
- a customer cannot read or cancel another customer's order or address
- checkout reprices from the server and rejects a cart the stock cannot cover
- a repeated webhook or cancel does not double-refund or double-release stock
- a public query never returns `purchasePrice`-style fields

No test that restates a table or a string.
