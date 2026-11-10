# Launch checklist

How to take the store from staging (this repo) to aggarwalkart.in. Production is launched from a
**separate repo** with its own Convex and Vercel projects (see
[08 – Environments and deployment](./08-environments-and-deployment.md)). Nothing here is done by
the build; each item is a decision or an action for a person.

Items marked **ask** are not decided. The list of them lives in the store profile
(`.agents/skills/store-app/references/store-profile.md` → **To dictate**).

## 1. Decide first

- [ ] **Go-live date**, and who is available that day (ask).
- [ ] **Who owns the production accounts**: GitHub, Convex, Vercel, Razorpay, Resend, the domain (ask).
- [ ] **Domain and DNS access** for aggarwalkart.in: who can edit DNS, and where it is registered (ask).
- [ ] **Carry over WooCommerce customers, orders, products?** (ask). Products need the WooCommerce
      export either way; customers and orders only if the client wants them.
- [ ] **The client's answers still open**: GST (registered, scheme, rates, "Tax invoice" or "Bill of
      supply", CGST/SGST/IGST, GST on delivery), invoice prefix, legal name and address, couriers,
      delivery zones, fees and pincodes, payment window, return window, brand logo and colours.

## 2. Content the client must confirm

- [ ] The eight policy texts in `src/lib/store/policies.ts`, copied from the live site and checked by
      the client. A policy with no text shows a "being prepared" notice and is kept out of search
      engines. Do not launch with any of them empty.
- [ ] Shop details typed into `/admin/settings` on the **production** deployment: legal name, address,
      phone, WhatsApp, email, GSTIN, invoice prefix, zones and pincodes, current session. They are
      never written in the repo.
- [ ] Real catalogue: import the stock sheet at `/admin/products/import`; real school sets per class.

## 3. New production projects

- [ ] New **Convex project**. Production deploy key into the new Vercel project.
- [ ] New **Vercel project** from the launch repo. Leave `PUBLIC_APP_ENV` unset (it adds the Staging
      badge and makes `/robots.txt` block every crawler).
- [ ] Convex env vars on production (`npx convex env set --prod NAME value`):
  - Better Auth: `BETTER_AUTH_SECRET` (new), `BETTER_AUTH_ALLOWED_HOSTS`, `BETTER_AUTH_FALLBACK_URL`
  - `ADMIN_USER_IDS` (after the owner's first sign-in)
  - Email: `RESEND_API_KEY`, `EMAIL_SEND_FROM`
  - Phone OTP: `OTP_CHANNELS` (never `OTP_ALLOW_CONSOLE`) and the channel's keys
  - Google sign-in: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and take the consent screen out of
    **Testing** mode
  - Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (**live** keys), `RAZORPAY_WEBHOOK_SECRET`
- [ ] Razorpay: KYC complete, live keys, webhook `https://<deployment>.convex.site/razorpay-webhook`
      with `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`.
- [ ] **Resend**: verify a sending domain (a subdomain such as `mail.aggarwalkart.in` leaves the live
      site's own email alone), then set `EMAIL_SEND_FROM`. Until then only the account owner gets mail.
- [ ] **SMS OTP at scale** to Indian numbers needs TRAI **DLT** registration. Start early: it takes
      days. Until it is done, keep a working fallback channel.
- [ ] Do **not** run the demo seed on production.

## 4. Before the switch

- [ ] Place a real test order on the production URL (cash on delivery, then online with a small
      amount), ship it, check the invoice number and PDFs, then cancel/refund and see the stock return.
- [ ] `/sitemap.xml` lists the real products, schools and sets; `/robots.txt` allows the site and
      blocks `/admin`, `/account`, `/checkout`, `/orders`, `/cart`, `/api`, `/signin`.
- [ ] Old WooCommerce addresses redirect (`src/lib/store/redirects.ts`). It only knows the addresses
      seen so far; **add every real product, category and school-set URL from the WooCommerce
      export** before the switch, or links in Google and on WhatsApp will land on a list page.
- [ ] Take a backup of the old site (database and uploads) and keep it.
- [ ] Lower the DNS TTL on aggarwalkart.in a day ahead, so a rollback is quick.

## 5. DNS cutover and rollback

1. Add aggarwalkart.in to the new Vercel project and note the records it asks for.
2. Point the domain at Vercel (replace the WooCommerce host's A/CNAME records). Keep a copy of the
   old records.
3. Check the site, sign-in, an order and the webhook on the real domain. Update
   `BETTER_AUTH_ALLOWED_HOSTS`, `BETTER_AUTH_FALLBACK_URL` and the Google and Razorpay redirect
   and webhook addresses if they used a temporary URL.
4. Submit `/sitemap.xml` in Google Search Console.

**Rollback:** put the old DNS records back. The old WooCommerce site is untouched until you do
this, so the switch is reversible as long as you do not close that hosting. Orders placed on the new
site in the meantime are in Convex (`npx convex export` before and after).

## 6. After launch

- [ ] Watch the first orders, payments and webhook deliveries in the admin and the Razorpay dashboard.
- [ ] `npx convex export` on a schedule; take one before any migration.
- [ ] Keep `legacy/` and the `old-store` tag. They are never deleted.
