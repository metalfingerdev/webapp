# Admin side

For the owner and staff (app admins). Every function here calls `requireAppAdmin`.

## Routes

| Route                                       | What                                                  |
| ------------------------------------------- | ----------------------------------------------------- |
| `/admin`                                    | Order board; the open/closed switch for taking orders |
| `/admin/orders`, `/admin/orders/[number]`   | Search and one order                                  |
| `/admin/products`, `/admin/products/import` | Catalogue, stock, CSV/XLSX import and export          |
| `/admin/categories`                         | Add, rename, hide, reorder                            |
| `/admin/schools`, `/admin/schools/[id]`     | Schools, their classes and sets, per session          |
| `/admin/shipping`                           | Orders ready to ship; enter courier and AWB           |
| `/admin/enquiries`                          | Product On Demand inbox                               |
| `/admin/settings`                           | Business details, fees, windows, policies             |
| `/admin/users`                              | The template's user dashboard (already there)         |

## Live order board (`/admin`)

Columns: Awaiting payment, Paid, Packed, Shipped. Cards show number, customer, total, age, and a warning
for unpaid orders near their window. A reactive query, bounded to open orders. Actions go through
`transitionOrder`.

## Stock and products

- Products are entered one by one and by import. Hide, never delete.
- A stock panel per product: Received, Damaged, a shelf count, and the last 20 changes. Every change goes
  through `adjustStock`. A count sets stock to _count minus what open orders hold_, and is refused if the
  stock moved since it was shown.
- Low stock and out of stock filters.
- **Import** ports `src/lib/products/import.ts` (the stock-sheet parser) behind one planner used by both
  the preview and the apply, which is all or nothing. A blank cell keeps the value. The stock column has a
  mode: leave alone (default), add as received, or set to a counted number.

## Schools and sets

- Add a school, then its classes for a session, then the set's lines (pick products, quantity, optional).
- **Copy to next session**: duplicate a school's sets into the new session, then edit what changed.
- A set that has no lines or an inactive book is flagged so it isn't published half-empty.
- Changing a set never changes past orders (they snapshot).

## Orders (`/admin/orders`)

Search by number, phone or name; filter by status. One page shows items, address, payment, shipment
and the full history. Cancel (with refund if paid), mark packed, print the packing slip.

## Shipping

See `shipping.md`.

## Settings (`/admin/settings`)

Business and legal name, phone, WhatsApp, email, address, GSTIN, invoice prefix, shipping fees and free
threshold, payment window, return window, `placedOrdersOpen`. Values are validated and the public subset
is what customers see. Nothing here is committed to the repo.

## "Today" and the clock

Queries can't read the clock. A day's start in IST is computed on the client and passed in; mutations may
use `Date.now()`. Dates are shown in IST.

## Invoices

- Created when an order becomes `paid`, with a **sequential number per financial year** (April to March):
  prefix + `YY-YY/` + zero-padded counter, taken atomically from `invoiceCounters`.
- Stored fields on the order: number, date, taxable value and GST per rate, buyer and seller details
  snapshot. The seller details come from `storeSettings`.
- Rendered with pdfmake on the client (port `src/lib/pdf/*` and `lib/orderDocument.ts`), lazy-loaded in admin
  only. The packing slip uses the same document model with no prices.
- The GSTIN, HSN and rate are snapshotted per line. Confirm the GST scheme with the CA first
  (`store-profile.md`).

## Reports (keep small)

Today's orders and revenue, orders by status, low-stock list, unpaid orders. Nothing more until asked.
