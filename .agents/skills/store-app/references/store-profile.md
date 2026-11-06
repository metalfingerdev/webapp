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
- **What the shop is** (dictated 2026-11-06): a school **books and uniforms** store, plus stationery and
  other books. The focus is parents buying a child's whole school year at once (book set and uniform)
  as bundles, for schools the client has tied up with. Broad catalogue shape: **school → books or
  uniforms → grade (class), gender, size**, and on the other side ordinary stationery. This is the usual
  Indian "authorised school vendor" model: the school names a shop, parents pick school and class, buy
  the set, and uniforms are chosen by gender and size.
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

| Item                                                               | Value                                                                                     | Used for                                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| Courier and how AWBs are entered (manual or API)                   | **TODO (dictate)**                                                                        | `shipments`, shipping screen             |
| Shipping fee, free-shipping threshold, zones                       | **TODO (dictate)**; placeholder flat ₹79, free from ₹999, one zone                        | `priceCart`                              |
| Store pickup, or local delivery in Faridabad?                      | **TODO (dictate)**; placeholder: courier delivery only                                    | checkout options                         |
| Online payment only, or cash on delivery too?                      | **TODO (dictate)**; placeholder: online only, no COD                                      | checkout, order states                   |
| Product export from WooCommerce, real category list                | not yet (2026-11-06); broad shape is known (see above)                                    | step 2                                   |
| What each set contains, per school and class                       | not yet (2026-11-06)                                                                      | `setItems`                               |
| Uniform items, sizes and size chart per school                     | shape dictated 2026-11-06 (see Decisions); real items, sizes and chart **TODO (dictate)** | uniform products, set page               |
| What may be unticked from a set (workbooks, notebooks, stationery) | **TODO (dictate)**                                                                        | set page                                 |
| Optional extras: covering, labelling                               | **none** (dictated 2026-11-06)                                                            | set page                                 |
| Current academic session and when the next opens                   | **TODO (dictate)**; placeholder 2026-27                                                   | `schoolSets.session`                     |
| Cancellation and return windows                                    | **TODO (dictate)**; placeholder: cancel until packed, return 7 days                       | order rules (from the live policy pages) |
| GST: registered, GSTIN, composition scheme?                        | **TODO (dictate)**, confirm with the CA                                                   | invoice tax columns                      |
| Invoice prefix (3 letters or fewer)                                | **TODO (dictate)**                                                                        | invoice numbers                          |
| Legal name and address for invoices                                | **TODO (dictate)**                                                                        | invoice header                           |
| Store phone, WhatsApp, email                                       | **TODO (dictate)**, entered in the admin                                                  | help text, footer                        |
| Brand colours and logo                                             | **TODO (dictate)**                                                                        | `src/themes/palette.css`                 |
| Languages in the UI                                                | English, Hindi-ready (all text in `src/lib/store/strings.ts`)                             | `strings.ts`                             |
| Carry over WooCommerce customers, orders, products?                | **TODO (dictate)**                                                                        | migration script                         |
| Who works the admin; is a role narrower than admin needed?         | **TODO (dictate)**                                                                        | `roles-and-access.md`                    |

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
- **The live site's content in the hims + Apple design language; all code rebuilt** (2026-11-06,
  dictated, refined the same day; replaces "function first, visual design last"). Screens take their
  content and structure from the real aggarwalkart.in: schools grid, the three promises, Product On
  Demand, footer and policy links. They take their look and interaction from the user's old local UI
  in `legacy/`: floating nav bar, mega menu, search panel and sidebar, pushed further toward hims.com
  and Apple. The code, tables and components are new. Why: customers know the live shop; the user
  wants the premium feel they were working towards; the old code can't run on the new data model.
  How: `references/design.md`. To see the old UI, `git switch --detach old-store`.
- **Workflow**: one branch and one draft PR per step; the user reviews and merges. `main` is protected
  on GitHub (PRs only), and the git hooks refuse commits on `main`.
- **This repo is staging** (2026-11-06). The store is built and shown to the client here; the live
  store on aggarwalkart.in launches later from a separate repo. Why: the user wants a clean repo for the
  real launch. So: never hard-code this repo's name, Vercel project or Convex deployment.
- **Accounts** (2026-11-06): the user owns every account for now (GitHub, Convex, Vercel, Razorpay
  test, Resend). Who owns production is settled at launch.
- **Books and uniforms, simple delivery** (2026-11-06, dictated). The store sells school book sets
  and school uniforms (by class, gender and size) plus stationery and general books. No covering or
  labelling: a simple store with courier delivery. Placeholder business values ("typical") are fine
  until the client answers; each is a named constant marked TODO (dictate).
- **Uniform shape** (2026-11-06, dictated, typical Indian private school). Each school has two
  uniforms: **regular** and **sports**, plus a few accessories (belt, socks and similar). A uniform is a
  top and a bottom: boys shirt and trousers (shorts in primary), girls shirt and skirt. Uniforms differ
  by class band. **Price changes with size.** Why: so a product has one variant per size, each with its
  own price and stock, and uniform sets exist per school, gender, class band and type.
  Added the same day: there is a **winter** uniform (sweater or blazer), the sports uniform has a
  **house-colour T-shirt** (so a variant can be size + house), and **shoes** are sold. Class bands
  (placeholder, researched as typical: shorts up to Class 5, trousers from Class 6): pre-primary
  (Mont-01 to Mont-03), primary (Class 1 to 5), senior (Class 6 to 12). Real bands per school TODO (dictate).
- **Client questions go through the user** (2026-11-06). Ask the user when a step needs an answer;
  they get it from the client. Don't batch questions far ahead of the step that needs them.

## Roadmap

The agreed order. Each step is one branch (`step-<n>-<short-name>`) and one PR. A session works on the
first step that is not **built**. "Needs" lists what the client must provide: ask for it early, because a
real client takes days to answer. Where it isn't there yet, build with a named placeholder constant and
list it in the report.

**UI in every step:** read `references/design.md` first. Screens take their content and structure
from the live aggarwalkart.in and their look from `legacy/`, in the hims + Apple direction. "_Look
from_" names the `legacy/` files a step reproduces in that style and then deletes. A step isn't done
until its screens follow `design.md`; the step's PR names any deliberate departure.

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
   - A bare home page and shop header (brand, account menu, admin link) so the app still runs. This is
     a stand-in: step 2 replaces it with the real navigation bar and home page (`design.md`).
   - _Done when_: checks pass, `npx convex run store/seed:run` fills dev, refusal tests pass, the app
     starts with no old store code inside `src/`.
   - _Needs_: nothing blocking. Send the client the questions for steps 2 to 5 now.
2. **Catalogue.** Categories, product pages, search (title, author, ISBN), URL filters; ports
   `legacy/src/lib/shop/filters.svelte.ts` and the search text builder. Also the app shell, navigation bar,
   home page and footer from `design.md`: the live site's sections (schools grid, three promises,
   contact, footer links) in the old UI's style. The nav has a tap-to-open mega menu (schools, books,
   uniforms, stationery), a search panel and a slide-out sidebar (its cart panel waits for step 4).
   _Look from_: `legacy/src/components/{app,navbar,sidebar}/`, `legacy/src/lib/{navbar,sidebar}/`,
   `legacy/src/components/shop/{product-view,filters-bar,filters-sidebar}.svelte`,
   `legacy/src/routes/(app)/(home)` and `shop/`. _Needs_: the real category list and an export of the
   current WooCommerce products (CSV), even rough.
3. **School sets.** `/schools`, school and class pages, the set page with optional lines, session label,
   and uniform sets with a size picker per line, as a guided flow (school, class, books or uniform,
   sizes; `design.md`). _Look from_: `legacy/src/components/shop/bundle-view.svelte`,
   `legacy/src/components/sidebar/school.svelte`. _Needs_: each school's book list per class for the current session (photos or PDFs are fine), which
   items are optional, and whether covering or labelling is offered.
4. **Cart.** Guest and signed-in, merge on sign-in, cart sheet and `/cart`. _Look from_:
   `legacy/src/components/sidebar/cart.svelte`, `legacy/src/lib/cart/`. _Needs_: nothing.
5. **Checkout and orders.** Addresses, `priceCart`, `placeOrder` (reprice, hold stock), `transitionOrder`,
   `/orders`, cancel. Recommended here: set up Playwright with one checkout spec against dev
   (`docs/09-testing.md`). _Look from_: `legacy/src/components/checkout/`, `legacy/src/routes/(app)/user/`.
   _Needs_: shipping fee and free-shipping threshold, COD yes or no,
   cancellation window, delivery estimate wording.
6. **Razorpay** (`payments.md`). _Needs_: the client's Razorpay account; test keys and the webhook secret
   on dev; KYC and live keys before launch.
7. **Admin.** Products, stock and import (port `legacy/src/lib/products/import.ts`), then schools and
   sets (with "copy to next session"), then the order board and shipping (`shipping.md`), then
   `/admin/settings`. _Look from_: `legacy/src/components/dashboard/`, `legacy/src/routes/(app)/dashboard/`.
   _Needs_: who works the admin, the courier(s) used, the real store details typed
   into settings by the client.
8. **Invoices and packing slips.** Sequential numbers per financial year; port `legacy/src/lib/pdf/`.
   _Needs_: the CA's answer on GST (registered, scheme, rates, "Tax invoice" or "Bill of supply"), legal
   name and address, invoice prefix.
9. **Product On Demand.** Form, `enquiries`, email to the store, admin inbox. _Needs_: what the store
   promises after an enquiry, which address receives it.
10. **Policies, SEO and launch readiness.** Policy pages (text from the live site, checked by the
    client), sitemap, 301 map from the WooCommerce URLs, and `docs/launch.md`: the checklist for
    launching from the separate production repo (new Convex and Vercel projects, env vars, Razorpay live
    keys and webhook, Resend domain for aggarwalkart.in, DLT for SMS OTP, data migration if wanted, DNS
    cutover with a rollback plan). Delete `legacy/` and the `old-store` notes. _Needs_: the policy texts,
    the go-live date, who owns the production accounts, domain and DNS access, the WooCommerce data
    export.

## Status (what exists)

Step 0 is built (2026-11-06). **Next: step 1.** The old store (products, schools and bundles, cart,
mock checkout, orders, dashboard, PDFs) still runs inside `src/` until step 1 moves it to `legacy/`.

When a step lands, mark it **built** in the roadmap with the date, write what was built here in a few
lines (routes, main functions, anything surprising), and move "Next" on.
