# Data model

Read before adding or changing a table. Everything is `userId: v.string()` (the Better Auth user id);
there is no `users` table. Money is integer paise, GST rates are basis points, times are ms since epoch.
Every table that is listed or filtered has an index for it; queries are bounded.

## Validators

Shared in `src/convex/store/validators.ts`: `productKind` (`book`, `uniform`, `stationery`), `gender`,
`uniformType` (`regular`, `sports`, `winter`), `uniformPart` (`top`, `bottom`, `accessory`,
`footwear`), `setType`, `orderStatus`, `paymentStatus`, `stockReason`, `gstRate` (0, 500, 1200, 1800,
2800 or `exempt`), `indianPincode` / `isIndianPincode`, `session` / `isSession` ("2026-27"), `phone`
(E.164, reuse `src/convex/otp/phone.ts`), `addressSnapshot`, `cartLine`.

Classes are numbers (`model/store/classes.ts`): Mont-01 = -2, Mont-02 = -1, Mont-03 = 0, Class 1 to 12 =
1 to 12, so a set or uniform item covers a range (`classFrom`, `classTo`).

## Tables

Index names follow the Convex rule: `by_field1_and_field2`.

| Table              | Key fields                                                                                                                                                                                                                                                             | Indexes                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `categories`       | `name`, `slug`, `parentId?`, `sortOrder`, `isActive`                                                                                                                                                                                                                   | `by_slug`, `by_parentId_and_sortOrder`                                                           |
| `products`         | `title`, `slug`, `categoryId`, `kind`; books: `author?`, `publisher?`, `isbn?`, `edition?`, `subject?`; `classFrom?`, `classTo?`; uniforms: `schoolId?`, `gender?`, `uniformType?`, `part?`; `hsn`, `gstRate`, `imageId?`, `isActive`, `searchText`. No price or stock | `by_slug`, `by_categoryId_and_isActive`, `by_schoolId_and_kind`, `by_isbn`, search `search_text` |
| `productVariants`  | `productId`, `label`, `size?`, `house?`, `sku?`, `mrp`, `price`, `stock`, `lowStockAt`, `sortOrder`, `isActive`                                                                                                                                                        | `by_productId_and_sortOrder`, `by_sku`                                                           |
| `schools`          | `name`, `slug`, `isActive`, `sortOrder`                                                                                                                                                                                                                                | `by_slug`, `by_sortOrder`                                                                        |
| `schoolSets`       | `schoolId`, `type` (`books`, `uniform`), `label`, `classFrom`, `classTo`, `gender?`, `uniformType?`, `session`, `sortOrder`, `isActive`                                                                                                                                | `by_schoolId_and_session_and_sortOrder`, `by_schoolId_and_label_and_session`                     |
| `setItems`         | `setId`, `productId`, `variantId?` (unset on a uniform line: the parent picks a size), `quantity`, `isOptional`, `sortOrder`                                                                                                                                           | `by_setId_and_sortOrder`, `by_productId`                                                         |
| `carts`            | `userId`, `lines: [{ variantId, quantity, fromSetId? }]`, `updatedAt`                                                                                                                                                                                                  | `by_userId`                                                                                      |
| `addresses`        | `userId`, `name`, `phone`, `line1`, `line2?`, `landmark?`, `city`, `state`, `pincode`, `isDefault`                                                                                                                                                                     | `by_userId`                                                                                      |
| `orders`           | `userId`, `number` (readable, unique), `status`, `paymentStatus`, `address` (snapshot), `subtotal`, `shippingFee`, `total`, `placedAt`, `paidAt?`, `packedAt?`, `shippedAt?`, `deliveredAt?`, `cancelledAt?`, `refund?`                                                | `by_userId_and_placedAt`, `by_status_and_placedAt`, `by_number`                                  |
| `orderItems`       | `orderId`, `productId`, `variantId`, `title`, `variantLabel?`, `isbn?`, `hsn`, `gstRate`, `unitPrice`, `quantity`, `fromSetId?`                                                                                                                                        | `by_orderId`                                                                                     |
| `stockAdjustments` | `variantId`, `productId`, `delta`, `stockAfter`, `reason` (`received`, `damaged`, `count`, `order`, `cancel`, `import`), `orderId?`, `by`, `at`                                                                                                                        | `by_variantId_and_at`                                                                            |
| `shipments`        | `orderId`, `courier`, `awb`, `trackingUrl?`, `shippedAt`, `deliveredAt?`                                                                                                                                                                                               | `by_orderId`, `by_awb`                                                                           |
| `payments`         | `orderId`, `gatewayOrderId`, `gatewayPaymentId?`, `amount`, `status` (`creating`, `created`, `paid`, `failed`, `refunded`), `refund?`, `createdAt`                                                                                                                     | `by_orderId`, `by_gatewayOrderId`                                                                |
| `enquiries`        | `name`, `email`, `phone`, `bookName?`, `author?`, `classLevel?`, `status` (`new`, `quoted`, `closed`), `note?`, `createdAt`                                                                                                                                            | `by_status_and_createdAt`                                                                        |
| `storeSettings`    | one row: `businessName`, `legalName?`, `phone?`, `whatsapp?`, `email?`, `address?`, `gstin?`, `shippingFee`, `freeShippingFrom`, `returnWindowDays`, `invoicePrefix?`, `currentSession`, `placedOrdersOpen`                                                            | none (single row)                                                                                |
| `invoiceCounters`  | `financialYear`, `next`                                                                                                                                                                                                                                                | `by_financialYear`                                                                               |
| `otpDeliveries`    | already there (template)                                                                                                                                                                                                                                               | `by_phoneNumber`                                                                                 |

Notes:

- **Every product has at least one variant**, and price and stock live only on the variant. A book or
  stationery item has one `Default` variant; a uniform item has one per size, or per size and house
  colour for the house T-shirt. Price changes with size. Cart lines, order lines and the stock log all
  point to a variant. Why: one place for stock, so one helper can guard it.
- A set holds **lines**, not a price. Total = sum of `setItems.quantity × variant.price`, computed at
  checkout. Optional lines the customer unticked are left out. A uniform line has no `variantId` until
  the parent picks a size; a one-size item (a tie) may name it.
- `orderItems` copy title, variant label, ISBN, HSN, GST rate and price. `orders.address` is a copy too.
- Products, variants and sets are hidden (`isActive: false`), never deleted, once an order refers to them.
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

`adjustStock(ctx, { variantId, delta, reason, by, orderId? })` in `src/convex/model/store/stock.ts` is the
only code that writes `productVariants.stock` (the seed too: variants start at 0). It refuses to go below zero, writes a `stockAdjustments` row,
and returns the new level. Checkout uses it to hold stock; cancel uses it to release.
