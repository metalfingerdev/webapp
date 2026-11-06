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

- **Approach**: rebuild the store step by step (`SKILL.md`), retiring each old module as its replacement lands.
- **Foundation**: SvelteKit 3 + Convex + Better Auth from the template (done 2026-11-06). Auth, `/account`
  and `/admin` users already exist.
- **Public repo**: business identifiers live in `storeSettings`, not in the repo.
- **Roles**: store staff are app admins (`requireAppAdmin`). No separate roles yet.
- **Tests**: very few, and only ones that fail when behaviour breaks: security refusals, money and stock
  correctness, real invariants.
- **Function first, visual design last.**
- **Workflow**: one branch and one draft PR per step; the owner merges; merging to `main` deploys.

## Status (what exists)

Template foundation only. Store step 1 has not started. The old store code (products, schools and
bundles, cart, mock checkout, orders, dashboard, PDFs) still runs and is retired step by step.
