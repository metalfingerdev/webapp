# Shipping

Aggarwal Kart ships by courier across India. This replaces dukaan's delivery-partner screens: there are
no rider accounts, only the admin.

## Flow

1. Order is `paid`. It appears on `/admin/shipping` and on the board.
2. Staff pack it and print the packing slip (`packed`).
3. Book the courier outside the app (portal or pickup), then enter **courier name and AWB** on the order:
   `markShipped({ orderNumber, courier, awb, trackingUrl? })`. This creates the `shipments` row and moves
   the order to `shipped`.
4. The customer gets an email (Resend) and sees the courier and tracking link on `/orders/[number]`.
5. When delivered, staff mark it `delivered`.

## Rules

- `markShipped` is admin-only, validates the AWB (non-empty, reasonable length), and refuses a second
  shipment for the same order unless the first is voided.
- The tracking URL comes from a small table of courier templates in `model/store/couriers.ts`; the AWB
  is substituted in. Which couriers are used is `TODO (dictate)`.
- Delivery estimate shown to customers is "3 to 7 business days" from shipment, per the live policy.
- Shipping fee is charged at checkout from `storeSettings`; the shipment cost the store pays is not
  tracked in the app.

## Later (not in scope until asked)

Courier API for booking and automatic tracking, return pickups, multiple shipments per order, COD
remittance, local delivery in Faridabad.
