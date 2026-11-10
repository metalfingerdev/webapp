# Shipping

Aggarwal Kart ships by courier across India. This replaces dukaan's delivery-partner screens: there are
no rider accounts, only the admin.

## Flow

1. Order is `paid` (online) or `confirmed` (cash on delivery). It appears on the board under To pack.
2. Staff pack it and print the packing slip (`packed`). It moves to `/admin/shipping`.
3. For a **courier** zone, book the courier outside the app (portal or pickup), then enter **courier
   name and AWB**: `markShipped({ number, courier, awb, trackingUrl? })`. A **local** zone (Faridabad)
   needs neither. This creates the `shipments` row, issues the invoice and moves the order to
   `shipped`.
4. The customer gets an email (Resend; skipped for `...@phone.invalid` or without `EMAIL_SEND_FROM`)
   and sees "Shipped" with the courier and tracking link, or "Out for delivery" for a local zone, on
   `/orders/[number]`.
5. When delivered, staff mark it `delivered` (cash on delivery is marked paid then).

## Rules

- `markShipped` is admin-only, validates the AWB (non-empty, reasonable length) for a courier zone, and
  allows one shipment per order.
- The tracking URL comes from a small table of courier templates in `model/store/couriers.ts`; the AWB
  is substituted in. Which couriers are used is `TODO (dictate)`.
- The delivery estimate and fee shown to customers come from the order's delivery zone
  (`deliveryZones`, edited in `/admin/settings`). The shipment cost the store pays is not tracked.

## Later (not in scope until asked)

Courier API for booking and automatic tracking, return pickups, multiple shipments per order, COD
remittance.
