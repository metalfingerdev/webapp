# Admin side

For the owner and staff (app admins). Every function here calls `requireAppAdmin`.

## Routes

| Route                                                            | What                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `/admin`                                                         | Live order board                                              |
| `/admin/orders`, `/admin/orders/[number]`                        | Search and one order                                          |
| `/admin/products`, `/admin/products/new`, `/admin/products/[id]` | Catalogue, one product with its sizes, stock and log          |
| `/admin/products/import`                                         | CSV/XLSX import with a preview                                |
| `/admin/schools`, `/admin/schools/[id]`                          | Schools and their sets, per session                           |
| `/admin/schools/[id]/sets/[setId]`                               | One set's lines                                               |
| `/admin/shipping`                                                | Packed orders; enter courier and AWB                          |
| `/admin/enquiries`                                               | Product On Demand inbox                                       |
| `/admin/settings`                                                | Shop details, "Taking orders", delivery zones, Razorpay check |
| `/admin/users`                                                   | The template's user dashboard                                 |

Categories have no screen yet: they come from the seed until the real list arrives.

## Live order board (`/admin`)

Columns: Awaiting payment, To pack, Packed, and the latest 50 Shipped, with today's orders and revenue
(IST, computed on the client). A reactive query, bounded to open orders. Actions go through
`transitionOrder`.

## Stock and products

- Products are entered one by one and by import. Hide, never delete.
- A stock panel per product: Received, Damaged, a shelf count, and the last 20 changes. Every change goes
  through `adjustStock`. A count sets stock to _count minus what open orders hold_, and is refused if the
  stock moved since it was shown.
- Low stock and out of stock filters.
- **Import** (ported from `legacy/src/lib/products/import.ts`) runs one planner
  (`model/store/importPlan.ts`) for both the preview and the apply; the apply is refused if the plan
  changed since the preview. A blank cell keeps the value. The stock column has a
  mode: leave alone (default), add as received, or set to a counted number.

## Schools and sets

- Add a school, then its sets for a session, then each set's lines (pick products, quantity).
- **Copy to next session**: duplicate a school's sets into the new session, then edit what changed.
- Publishing is refused for a set with no lines or with hidden lines, so it isn't shown half-empty.
- Changing a set never changes past orders (they snapshot).

## Orders (`/admin/orders`)

Search by number, phone or name; filter by status. One page shows items, address, payment, shipment
and the full history. Cancel (with refund if paid online), mark packed, print the packing slip and
invoice, answer a return request (the refund itself is done by hand for now).

## Shipping

See `shipping.md`.

## Settings (`/admin/settings`)

Business and legal name, phone, WhatsApp, email, address, GSTIN, invoice prefix, return window,
current session, and the "Taking orders" switch (`placedOrdersOpen`). Delivery fees, thresholds,
estimates and pincodes live on the delivery zones, edited on the same page. The payment window is a code
constant. Values are format-checked and the public subset is what customers see. Nothing here is
committed to the repo.

## "Today" and the clock

Queries can't read the clock. A day's start in IST is computed on the client and passed in; mutations may
use `Date.now()`. Dates are shown in IST.

## Invoices

- Issued when the order **ships** (online and cash on delivery alike, 2026-11-09), with a **sequential number per financial year** (April to March):
  prefix + `YY-YY/` + zero-padded counter, taken atomically from `invoiceCounters`.
- Stored fields on the order: number, date, taxable value and GST per rate, buyer and seller details
  snapshot. The seller details come from `storeSettings`.
- Rendered with pdfmake on the client (`src/lib/store/pdf/*`, data from `model/store/orderDocument.ts`), lazy-loaded in admin
  only. The packing slip uses the same document model with no prices.
- The GSTIN, HSN and rate are snapshotted per line. Confirm the GST scheme with the CA first
  (`store-profile.md`).

## Reports (keep small)

Today's orders and revenue, orders by status, low-stock list, unpaid orders. Nothing more until asked.
