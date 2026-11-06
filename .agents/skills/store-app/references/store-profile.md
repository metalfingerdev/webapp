# Store profile: Aggarwal Kart

The only file in this skill that is specific to the store. Values marked **TODO (dictate)** haven't
been decided: don't invent them. Put a placeholder in one named constant
(`src/convex/model/store/storeProfile.ts`, which the seed copies into the `storeSettings` row), say so
in your report, and ask when it affects behaviour.

**This repo is public.** Phone, email, GSTIN, UPI id and the street address are entered by the owner in
`/admin/settings`, never written here or in code. They are on the live site (aggarwalkart.in footer).

## What's known

- **Business**: Aggarwal Books And Stationery Mart, sold online as **Aggarwal Kart**, in Faridabad (NCR),
  Haryana. It has a physical shop and a live website at aggarwalkart.in, which this project replaces.
- **Catalogue today**: Text Books, NCERT Books, Sample Papers, Entrance Exam Books, Language Books, and a
  "Product On Demand" section. Schools get a "Buy Books Set" page each.
- **Schools** (6): Ryan International School, Vidya Mandir Public School, Manaskriti School, AVN Senior
  Secondary School, Adarsh Vidya Niketan High School, Bhatnagar International Foundation School.
- **Class list** (Ryan, 15 sets): Mont-01 (Nur), Mont-02 (Jr. KG), Mont-03 (Sr. KG), Class 1 to 12. A set is
  one product with one price on the live site (about ₹4,300 to ₹7,800 for Mont and Classes 1 to 6); its
  contents are not shown. Other schools' lists may differ.
- **Shipping**: across India through unnamed courier partners. Orders are processed after payment is
  confirmed, usually in 1 to 3 business days, then delivery takes 3 to 7 business days. Shipping charges
  apply "in some cases" and show at checkout.
- **Policies that exist** and must be migrated as pages: Privacy, Terms & Conditions, Cancellation,
  Refund & Return, Shipping & Delivery, Payment, Grievance Redressal, Disclaimer.
- **Product On Demand**: an enquiry form (name, email, phone, author, book name, class 1st to 12th). What
  happens after it is sent is not stated.
- **Old site**: looks like WooCommerce, with URLs such as `/product-category/ris-sets/` and `/product-on-demand/`.
- **Currency**: INR, prices GST-inclusive, formatted with the `en-IN` locale.
- **Sign-in**: phone OTP first, Google and email also on (`src/convex/auth.constants.ts`).
- **Payment gateway**: Razorpay (already a dependency; the current checkout uses a mock).

## To dictate

| Item                                                               | Value                                                         | Used for                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------- |
| Courier and how AWBs are entered (manual or API)                   | **TODO (dictate)**                                            | `shipments`, shipping screen             |
| Shipping fee, free-shipping threshold, zones                       | **TODO (dictate)**                                            | `priceCart`                              |
| Store pickup, or local delivery in Faridabad?                      | **TODO (dictate)**                                            | checkout options                         |
| Online payment only, or cash on delivery too?                      | **TODO (dictate)**                                            | checkout, order states                   |
| What each set contains, per school and class                       | **TODO (dictate)**                                            | `setItems`                               |
| What may be unticked from a set (workbooks, notebooks, stationery) | **TODO (dictate)**                                            | set page                                 |
| Optional extras: covering, labelling                               | **TODO (dictate)**                                            | set page                                 |
| Current academic session and when the next opens                   | **TODO (dictate)**                                            | `schoolSets.session`                     |
| Cancellation and return windows                                    | **TODO (dictate)**                                            | order rules (from the live policy pages) |
| GST: registered, GSTIN, composition scheme?                        | **TODO (dictate)**, confirm with the CA                       | invoice tax columns                      |
| Invoice prefix (3 letters or fewer)                                | **TODO (dictate)**                                            | invoice numbers                          |
| Legal name and address for invoices                                | **TODO (dictate)**                                            | invoice header                           |
| Store phone, WhatsApp, email                                       | **TODO (dictate)**, entered in the admin                      | help text, footer                        |
| Brand colours and logo                                             | **TODO (dictate)**                                            | `src/themes/palette.css`                 |
| Languages in the UI                                                | English, Hindi-ready (all text in `src/lib/store/strings.ts`) | `strings.ts`                             |
| Carry over WooCommerce customers, orders, products?                | **TODO (dictate)**                                            | migration script                         |
| Who works the admin; is a role narrower than admin needed?         | **TODO (dictate)**                                            | `roles-and-access.md`                    |

When the user dictates values, update this table first, then the code constants and the seed.

## Decisions already made (don't re-ask)

Each entry has a date and the reason. When the user decides something new, add it here the same way.

- **Rebuild step by step** (2026-11-06). The store is rebuilt with this skill, one roadmap step per
  branch, not patched. Why: the old store was not built on the template, its checkout is a mock, and
  its schema can't hold real school sets (a set was one priced product).
- **Old code moves to `legacy/` in step 1** (2026-11-06). The new tables reuse names the old ones
  have (`products`, `schools`, `orders`, `addresses`), so the two can't run side by side. `legacy/`
  sits outside the build, so each step reads the old code there, ports what is worth keeping, and
  deletes those files. The tag `old-store` keeps the old app runnable from git.
- **Foundation from the template** (2026-11-06): SvelteKit 3, Convex, Better Auth with phone OTP,
  Google and email; `/account` and `/admin/users` already work.
- **Public repo** (2026-11-06). Phone, email, GSTIN, UPI id and street address live in the
  `storeSettings` row, typed into `/admin/settings`. Why: anything committed to a public repo is public
  forever, even after it is deleted.
- **Roles**: store staff are app admins (`requireAppAdmin`). No narrower staff role until asked.
- **Payment gateway**: Razorpay (already a dependency).
- **Tests**: few, and only ones that fail when behaviour breaks: security refusals, money and stock
  correctness, real invariants. Why: the user pays for every test run and every token.
- **Function first, visual design last.** Why: the screens will change once the client sees them working.
- **Workflow**: one branch and one draft PR per step; the user reviews and merges.

## Roadmap

The agreed order. Each step is one branch (`step-<n>-<short-name>`) and one PR. A session works on the
first step that is not **built**. "Needs" lists what the client must provide: ask for it early, because a
real client takes days to answer. Where it isn't there yet, build with a named placeholder constant and
list it in the report.

0. **Foundation** (**built**, 2026-11-06). SvelteKit 3, template auth, palette, docs, CI.

1. **Clear the ground and lay the store's base.**
   - Tag the current commit `old-store`. Move the old store into `legacy/` (outside `src/`, so it is not
     built, type-checked, linted or deployed): `src/convex/{products,productSearch,slugs,bundle,cart,orders,profile,addresses,dashboard,seed}.ts`,
     `src/convex/lib/`, `src/components/`, `src/lib/{cart,checkout,dashboard,navbar,pdf,products,razorpay,shop,sidebar}/`,
     `src/routes/(app)/` (keep `sitemap.xml` only if it still compiles, else move it too). Remove the old
     tables from `schema.ts`.
   - New tables from `data-model.md`, guards in `model/store/access.ts`, `store/access.ts#myRoles`,
     `storeSettings` with placeholders from `model/store/storeProfile.ts`, `adjustStock`.
   - Seed (`store/seed.ts`): the 6 schools, the categories, about 20 demo books with made-up prices,
     one demo set. Never real customer data.
   - Test harness `src/convex/store/harness.testutils.ts` and the refusal tests from `roles-and-access.md`.
   - A bare home page and shop header (brand, account menu, admin link) so the app still runs.
   - _Done when_: checks pass, `npx convex run store/seed:run` fills dev, refusal tests pass, the app
     starts with no old store code inside `src/`.
   - _Needs_: nothing blocking. Send the client the questions for steps 2 to 5 now.
2. **Catalogue.** Categories, product pages, search (title, author, ISBN), URL filters; ports
   `legacy/src/lib/shop/filters.svelte.ts` and the search text builder. _Needs_: the real category list
   and an export of the current WooCommerce products (CSV), even rough.
3. **School sets.** `/schools`, school and class pages, the set page with optional lines, session label.
   _Needs_: each school's book list per class for the current session (photos or PDFs are fine), which
   items are optional, and whether covering or labelling is offered.
4. **Cart.** Guest and signed-in, merge on sign-in, cart sheet and `/cart`. _Needs_: nothing.
5. **Checkout and orders.** Addresses, `priceCart`, `placeOrder` (reprice, hold stock), `transitionOrder`,
   `/orders`, cancel. Recommended here: set up Playwright with one checkout spec against dev
   (`docs/09-testing.md`). _Needs_: shipping fee and free-shipping threshold, COD yes or no,
   cancellation window, delivery estimate wording.
6. **Razorpay** (`payments.md`). _Needs_: the client's Razorpay account; test keys and the webhook secret
   on dev; KYC and live keys before launch.
7. **Admin.** Products, stock and import (port `legacy/src/lib/products/import.ts`), then schools and
   sets (with "copy to next session"), then the order board and shipping (`shipping.md`), then
   `/admin/settings`. _Needs_: who works the admin, the courier(s) used, the real store details typed
   into settings by the client.
8. **Invoices and packing slips.** Sequential numbers per financial year; port `legacy/src/lib/pdf/`.
   _Needs_: the CA's answer on GST (registered, scheme, rates, "Tax invoice" or "Bill of supply"), legal
   name and address, invoice prefix.
9. **Product On Demand.** Form, `enquiries`, email to the store, admin inbox. _Needs_: what the store
   promises after an enquiry, which address receives it.
10. **Policies, SEO and launch.** Policy pages (text from the live site, checked by the client),
    sitemap, 301s from WooCommerce URLs, production Convex and Vercel projects, Resend domain for
    aggarwalkart.in, DLT for SMS OTP, data migration if wanted, DNS cutover on an agreed date with a
    rollback plan. Delete `legacy/` and the `old-store` notes. _Needs_: domain and DNS access, who owns
    the production accounts, the go-live date, the policy texts, the WooCommerce data export.

## Status (what exists)

Step 0 is built (2026-11-06). **Next: step 1.** The old store (products, schools and bundles, cart,
mock checkout, orders, dashboard, PDFs) still runs inside `src/` until step 1 moves it to `legacy/`.

When a step lands, mark it **built** in the roadmap with the date, write what was built here in a few
lines (routes, main functions, anything surprising), and move "Next" on.
