# Customer side

## Routes

| Route                                         | What                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/`                                           | Hero search, "Find your school", categories, featured                                     |
| `/schools`                                    | The six schools                                                                           |
| `/schools/[school]`                           | Classes for the current session                                                           |
| `/schools/[school]/[class]`                   | The set page: lines, untick optional ones, total, Add to cart                             |
| `/shop`                                       | All books, filters in the URL (category, class, subject, price, in stock)                 |
| `/shop/[category]`, `/shop/[category]/[slug]` | Category and product page                                                                 |
| `/product-on-demand`                          | Enquiry form                                                                              |
| `/cart`, `/checkout`                          | Cart and checkout (checkout is private)                                                   |
| `/orders`, `/orders/[number]`                 | History, one order with status and courier link                                           |
| `/account`                                    | Template pages (profile, phone, email)                                                    |
| `/policies/[slug]`                            | Privacy, terms, cancellation, refund and return, shipping, payment, grievance, disclaimer |

Keep the old WooCommerce paths alive with 301s in step 10 (`/product-category/ris-sets/` →
`/schools/ryan-international-school`, and so on).

## Layout

Phone first. A sticky bottom cart bar with the item count and total. Home leads with finding your school
and class, because that is how most customers shop. Cards have a fixed image aspect ratio, a MRP
strike-through and a discount badge. Skeletons while loading.

## Reading the catalogue

Public queries project only customer fields (`src/convex/model/store/publicProjection.ts`): title, author,
price, MRP, image, availability. A hidden category or product disappears everywhere, and `placeOrder`
treats such a line as unavailable. Search is the Convex search index on title, author and ISBN; filters
are URL state (the pattern in `src/lib/shop/filters.svelte.ts` is worth porting).

## Set page

- Shows each book with its price, class and quantity, and the set total.
- Lines marked optional are ticked by default and can be unticked ("I already have this").
- Add to cart adds the product lines, not a set object; the cart groups them for display by `fromSetId`.
- If a book is out of stock the page says which one and still lets the customer buy the rest.
- Show the session ("2026-27") so a parent notices a stale list.

## Cart

Guest cart in `localStorage`, signed-in cart in `carts`. On sign-in the two merge by adding quantities,
capped by stock. The cart is a list of `{ productId, quantity }`; prices are always read live.

## Pricing

One pure function `priceCart(lines, settings, address)` in `src/convex/model/store/pricing.ts`, used by
the cart summary and again inside `placeOrder`. Port the math from `src/convex/lib/pricing.ts`. Returns
the lines, subtotal, shipping fee (free above the threshold, `TODO (dictate)`), tax split by rate, and
total, all in paise. Never recompute in the browser for anything but display.

## Checkout

1. Sign in (the template modal), keeping the cart.
2. Address: name, phone, line 1, line 2, landmark, city, state, pincode. Saved addresses are reusable.
   A pincode check can refuse unsupported areas later.
3. Review: lines, shipping, total, estimated delivery ("3 to 7 business days").
4. Pay: Razorpay Checkout (`payments.md`). Cash on delivery only if it was dictated.
5. `placeOrder` creates the order as `awaiting_payment`, holds stock, and returns the gateway order.

Rate limit `placeOrder` per user with `@convex-dev/rate-limiter`.

## Orders and tracking

`/orders/[number]` shows the status timeline, items, address, payment state, invoice download (step 8) and,
once shipped, the courier name, AWB and tracking link. Cancel is offered until `packed`, per the
cancellation policy. A reactive `useQuery` keeps the page live.

## Product On Demand

Public form: name, email, phone, book name, author, class. Validated on the server, rate limited by IP/
phone, stored in `enquiries`, and emailed to the store through the Resend component. The customer sees
a confirmation with the enquiry number. What the store promises next (a quote, a callback) is
`TODO (dictate)`.

## Accessibility and low-end phones

Large tap targets, visible focus, labels on every control, no hover-only actions, `prefers-reduced-motion`
respected, images lazy with `width`/`height`, no big client libraries on customer routes (pdfmake and xlsx
stay in admin only).
