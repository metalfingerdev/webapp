# Data model

Read before adding or changing a table. Everything is `userId: v.string()` (the Better Auth user id);
there is no `users` table. Money is integer paise, GST rates are basis points, times are ms since epoch.
Every table that is listed or filtered has an index for it; queries are bounded.

## Validators

Shared in `src/convex/store/validators.ts`: `orderStatus`, `paymentStatus`, `gstRate`
(0, 500, 1200, 1800, 2800 or exempt), `indianPincode` (6 digits, not starting with 0), `session`
("2026-27"), `phone` (E.164, reuse `src/convex/otp/phone.ts`).

## Tables

| Table              | Key fields                                                                                                                                                                                                                             | Indexes                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `categories`       | `name`, `slug`, `sortOrder`, `isActive`                                                                                                                                                                                                | `by_slug`, `by_sortOrder`                                          |
| `products`         | `title`, `slug`, `categoryId`, `kind` (`book` or `stationery`), `author?`, `publisher?`, `isbn?`, `edition?`, `subject?`, `classLevel?`, `mrp`, `price`, `hsn`, `gstRate`, `stock`, `lowStockAt`, `imageId?`, `isActive`, `searchText` | `by_slug`, `by_category_active`, `by_isbn`, search on `searchText` |
| `schools`          | `name`, `slug`, `isActive`, `sortOrder`                                                                                                                                                                                                | `by_slug`                                                          |
| `schoolSets`       | `schoolId`, `label` ("Class 1", "Mont-01 (Nur)"), `classOrder`, `session`, `isActive`                                                                                                                                                  | `by_school_session`, `by_school_label_session`                     |
| `setItems`         | `setId`, `productId`, `quantity`, `isOptional`                                                                                                                                                                                         | `by_set`, `by_product`                                             |
| `carts`            | `userId`, `lines: [{ productId, quantity }]`, `updatedAt`                                                                                                                                                                              | `by_userId`                                                        |
| `addresses`        | `userId`, `name`, `phone`, `line1`, `line2?`, `landmark?`, `city`, `state`, `pincode`, `isDefault`                                                                                                                                     | `by_userId`                                                        |
| `orders`           | `userId`, `number` (readable, unique), `status`, `paymentStatus`, `address` (snapshot), `subtotal`, `shippingFee`, `total`, `placedAt`, `paidAt?`, `cancelledAt?`, `refund?`, `setLabel?`                                              | `by_userId_placedAt`, `by_status_placedAt`, `by_number`            |
| `orderItems`       | `orderId`, `productId`, `title`, `isbn?`, `hsn`, `gstRate`, `unitPrice`, `quantity`, `fromSetId?`                                                                                                                                      | `by_order`                                                         |
| `stockAdjustments` | `productId`, `delta`, `reason` (`received`, `damaged`, `count`, `order`, `cancel`, `import`), `orderId?`, `by`, `at`                                                                                                                   | `by_product_at`                                                    |
| `shipments`        | `orderId`, `courier`, `awb`, `trackingUrl?`, `shippedAt`, `deliveredAt?`                                                                                                                                                               | `by_order`, `by_awb`                                               |
| `payments`         | `orderId`, `gatewayOrderId`, `gatewayPaymentId?`, `amount`, `status` (`creating`, `created`, `paid`, `failed`, `refunded`), `refund?`, `createdAt`                                                                                     | `by_order`, `by_gatewayOrderId`                                    |
| `enquiries`        | `name`, `email`, `phone`, `bookName?`, `author?`, `classLevel?`, `status` (`new`, `quoted`, `closed`), `note?`, `createdAt`                                                                                                            | `by_status_createdAt`                                              |
| `storeSettings`    | one row: business name, legal name, phone, email, address, GSTIN, shipping fees and threshold, return windows, invoice prefix, `placedOrdersOpen`                                                                                      | none (single row)                                                  |
| `invoiceCounters`  | `financialYear`, `next`                                                                                                                                                                                                                | `by_financialYear`                                                 |
| `otpDeliveries`    | already there (template)                                                                                                                                                                                                               | `by_phoneNumber`                                                   |

Notes:

- A set holds **lines**, not a price. Total = sum of `setItems.quantity × products.price`, computed at
  checkout. Optional lines the customer unticked are left out.
- `orderItems` copy title, ISBN, HSN, GST rate and price. `orders.address` is a copy too.
- Products and sets are hidden (`isActive: false`), never deleted, once an order refers to them.
- Prices include GST; `orderItems` keep the rate so the invoice can split taxable value and tax.

## State machine

```
awaiting_payment ──paid──▶ paid ──▶ packed ──▶ shipped ──▶ delivered
       │                     │         │
       └──────▶ cancelled ◀──┴─────────┘          (refund if paid)
```

- All status changes go through one `transitionOrder` helper, which checks the move is allowed, writes
  the timestamp, and does the side effect (release stock, request a refund). Retried calls do nothing twice.
- `awaiting_payment` holds the stock. A payment window (named constant) plus a short grace cancels the
  order and releases it.
- `shipped` needs a `shipments` row; `delivered` is set by the admin (or a courier webhook later).

## Stock helper

`adjustStock(ctx, { productId, delta, reason, orderId? })` in `src/convex/model/store/stock.ts` is the
only code that writes `products.stock`. It refuses to go below zero, writes a `stockAdjustments` row,
and returns the new level. Checkout uses it to hold stock; cancel uses it to release.
