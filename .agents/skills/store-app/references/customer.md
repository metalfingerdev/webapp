# Customer side

## Routes

| Route                                         | What                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/`                                           | Hero, schools grid, how it works, categories, contact                                     |
| `/schools`                                    | The six schools                                                                           |
| `/schools/[school]`                           | Book sets and uniforms for the current session, as guided steps kept in the URL           |
| `/schools/[school]/[set]`                     | The set page (`[set]` is the set's id): lines, untick, copies, extras, total, Add to cart |
| `/shop`                                       | All products, filters in the URL (class, school, price, in stock), `?q=` search, sort     |
| `/shop/[category]`, `/shop/[category]/[slug]` | Category and product page                                                                 |
| `/product-on-demand`                          | Enquiry form                                                                              |
| `/cart`, `/checkout`                          | Cart (public) and checkout (private)                                                      |
| `/orders`, `/orders/[number]`                 | History, one order with status, tracking, invoice, cancel and return                      |
| `/account/profile`                            | Template account settings; the rest of the account is a view in the drawer                |
| `/policies`, `/policies/[slug]`               | Privacy, terms, cancellation, refund and return, shipping, payment, grievance, disclaimer |

Old WooCommerce paths get a 301 from `src/lib/store/redirects.ts` (applied first in
`hooks.server.ts`). It only knows `/product-category/*`, `/product/*` and a few pages until the
WooCommerce export arrives.

## Layout

Phone first. The menu, cart and account are views of one drawer from the right (`MenuDrawer.svelte`).
Home leads with finding your school and class, because that is how most customers shop. Cards have a
fixed image aspect ratio, a MRP strike-through and a discount badge. Skeletons while loading. The look
is `design.md` and `docs/10-ui.md`.

## Reading the catalogue

Public queries project only customer fields (`src/convex/model/store/publicProjection.ts`): title, author,
price, MRP, image, availability. A hidden category, product or size disappears everywhere, and
`placeOrder` treats such a line as unavailable. Search is the Convex search index on title, author and
ISBN; filters are URL state. Sorting reorders only the loaded page, because price lives on variants.

## Set page

- Shows each line with its price, class and quantity, and the set total. A uniform line has a size
  picker.
- **Every line can be unticked** ("I already have this"); only an empty selection is refused
  (`model/store/setSelection.ts`). The parent can also change copies per line and tick extras.
- Add to cart adds the product lines, not a set object; the cart groups them for display by `fromSetId`,
  and "Edit set" in the cart comes back here to change them.
- If a line is out of stock the page says which one and still lets the customer buy the rest.
- Show the session ("2026-27") so a parent notices a stale list.

## Cart

Guest cart in `localStorage` (`aggarwalkart:cart`), signed-in cart in `carts`. On sign-in the guest
lines merge in (`mergeGuest`), capped by stock and `MAX_LINE_QUANTITY`. A line is
`{ variantId, quantity, fromSetId? }`; prices are always read live. The cart holds no stock.

## Pricing

One pure function `priceCart(lines, zone)` in `src/convex/model/store/pricing.ts`, used by the checkout
preview and again inside `placeOrder`. Returns the lines, subtotal, delivery fee (from the delivery zone,
free from its threshold), tax split by rate, and total, all in paise. Never recompute in the browser for
anything but display.

## Checkout

1. Sign in, keeping the cart.
2. Address: name, phone, line 1, line 2, landmark, city, state, pincode. Saved addresses are reusable.
   The pincode picks the delivery zone (`model/store/delivery.ts#findZone`); no zone means "we do not
   deliver there yet".
3. Review: lines, delivery fee, total, the zone's delivery estimate.
4. Pay: online through Razorpay Checkout (`payments.md`) when its keys are set, or cash on delivery.
5. `placeOrder` reprices, holds stock and creates the order: `awaiting_payment` for online,
   `confirmed` for cash on delivery.

`placeOrder` is rate limited per customer with `@convex-dev/rate-limiter`.

## Orders and tracking

`/orders/[number]` shows the status timeline, items, address, payment state, invoice download once it
ships and, for a courier zone, the courier, AWB and tracking link. Cancel is offered until the order
ships; after delivery, a return request inside the return window. A reactive query keeps the page live.

## Product On Demand

Public form: book name, author, class, name, phone, email (a signed-in parent's details are filled in).
Validated on the server, rate limited per phone plus a shop-wide limit (Convex cannot see an IP), stored
in `enquiries`, and emailed to the shop email from settings through Resend. The customer sees a
confirmation with the enquiry number and `ENQUIRY_PROMISE` (placeholder, `TODO (dictate)`).

## Accessibility and low-end phones

Large tap targets, visible focus, labels on every control, no hover-only actions, `prefers-reduced-motion`
respected, images lazy with `width`/`height`, no big client libraries on customer routes (pdfmake loads
only when a PDF button is tapped; xlsx only on the admin import page).
