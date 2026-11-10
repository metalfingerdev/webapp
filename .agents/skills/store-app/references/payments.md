# Online payments

Read this when adding pay-online at checkout or refunds. Razorpay is the gateway; the pattern holds for
any gateway. Built in step 6: `store/payments.ts`, `model/store/{razorpay,payments,refunds,paymentWebhook}.ts`,
and the webhook route in `http.ts`. Online payment is offered only where the Razorpay keys are set.

- **Only the gateway marks an order paid.** A signed webhook (verify the HMAC with the webhook secret, in
  `src/convex/http.ts`, at `https://<deployment>.convex.site/razorpay-webhook`) or a server-side status
  check. Never the browser's success callback alone, and never a staff member's word.
- **Keys are secrets**: Convex env vars per deployment (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET`), test keys on dev and staging, never the repo. One webhook per deployment,
  each with its own URL. The key id is public and may be passed to the client by the server.
- **Create the gateway order on the server**, with the amount taken from the stored order total in paise,
  never from the client. Save the `payments` row as `creating` first, then `created` with the gateway id,
  so a crash between asking the gateway and saving is visible and recoverable.
- **Verify on return** too: after Razorpay Checkout succeeds, the client calls a server action that checks
  the signature, so the customer sees "paid" without waiting for the webhook. The webhook still decides.
- **Payment window**: an online order waits as `awaiting_payment` with its stock held. Give it a named
  constant window plus a short grace, then cancel it and release the stock (a scheduled function). Money
  that arrives after the cancel is refunded, not ignored.
- **Refunds** go through `transitionOrder` so they are idempotent: a retried cancel or a repeated webhook
  must not refund twice. Track a refund state on the order (`refund`) and handle `refund.processed` and
  `refund.failed`.
- **Idempotency**: key webhook handling on the gateway event id; ignore events for unknown orders after
  logging them.
- Build a "check payment setup" action that tells the owner which env var is missing, and an admin
  payments list showing each payment with its refund state.
- Cash on delivery was dictated (2026-11-07) and is built: its orders start `confirmed` and are marked
  paid on delivery. No COD fee (placeholder, `store-profile.md`).
