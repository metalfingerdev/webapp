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

| Item                                                                                                                                                    | Value                                                                                                                                      | Used for                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Courier and how AWBs are entered (manual or API)                                                                                                        | AWB typed in by hand (`shipping.md`); couriers a placeholder list (India Post, DTDC, Delhivery, Blue Dart, Other), **TODO (dictate)**      | `shipments`, shipping screen             |
| Delivery fee, free-delivery threshold, COD fee                                                                                                          | dictated 2026-11-07: "make up typical" → placeholder flat ₹50, free from ₹1,000, no COD fee; client to confirm                             | `priceCart`                              |
| Where it delivers                                                                                                                                       | **Faridabad only for now, as the first delivery zone; built to add zones** (dictated 2026-11-07); its pincode list **TODO (dictate)**      | checkout address check                   |
| Online payment only, or cash on delivery too?                                                                                                           | **both** (dictated 2026-11-07)                                                                                                             | checkout, order states                   |
| Product export from WooCommerce, real category list                                                                                                     | not yet (2026-11-06); broad shape is known (see above)                                                                                     | step 2                                   |
| What each set contains, per school and class                                                                                                            | not yet (2026-11-06)                                                                                                                       | `setItems`                               |
| Uniform items, sizes and size chart per school                                                                                                          | shape dictated 2026-11-06 (see Decisions); real items, sizes and chart **TODO (dictate)**                                                  | uniform products, set page               |
| What may be unticked from a set                                                                                                                         | **everything** (dictated 2026-11-07, see Decisions)                                                                                        | set page                                 |
| Optional extras: covering, labelling                                                                                                                    | **none** (dictated 2026-11-06)                                                                                                             | set page                                 |
| Current academic session and when the next opens                                                                                                        | 2026-27 now; next opens April 2027 (all Indian private schools run April to March)                                                         | `schoolSets.session`                     |
| How long an unpaid online order holds its stock                                                                                                         | placeholder **30 minutes** + 5 minutes' grace (chosen 2026-11-08, `PAYMENT_WINDOW_MINUTES`); client to confirm                             | payment expiry                           |
| Cancellation and return windows                                                                                                                         | cancel until the order ships; after delivery a return request (dictated 2026-11-07); return window days still placeholder 7                | order rules (from the live policy pages) |
| GST: registered, GSTIN, composition scheme?                                                                                                             | **TODO (dictate)**, confirm with the CA                                                                                                    | invoice tax columns                      |
| Tax invoice or Bill of supply; CGST + SGST or IGST outside Haryana; GST on the delivery fee                                                             | **TODO (dictate)**, ask the CA. Placeholder: titled "Invoice", tax shown once per rate, none on delivery                                   | invoice wording and tax split            |
| Invoice prefix (3 letters or fewer)                                                                                                                     | **TODO (dictate)**                                                                                                                         | invoice numbers                          |
| Legal name and address for invoices                                                                                                                     | **TODO (dictate)**                                                                                                                         | invoice header                           |
| Store phone, WhatsApp, email                                                                                                                            | **TODO (dictate)**, entered in the admin                                                                                                   | help text, footer                        |
| Brand colours and logo                                                                                                                                  | **TODO (dictate)**                                                                                                                         | `src/themes/palette.css`                 |
| Real figures and quotes for the home page: students served, years open, parent or principal quotes; and whether to show a "for schools" partner section | **TODO (dictate)**; the home page shows only true facts until then (decided 2026-11-08)                                                    | home page stats and testimonials         |
| The shop's logo (favicon, later the masthead)                                                                                                           | **TODO (dictate)**; placeholder favicon `static/favicon.svg`, a cream "A" on the brand teal (2026-11-09)                                   | browser tab icon                         |
| What the shop promises after a Product On Demand enquiry                                                                                                | placeholder "call or WhatsApp within 2 working days with price and availability" (`ENQUIRY_PROMISE`, chosen 2026-11-09); client to confirm | enquiry confirmation                     |
| Who receives enquiry emails                                                                                                                             | the shop email in `/admin/settings` (chosen 2026-11-09); nothing is sent until a Resend domain exists                                      | enquiry email                            |
| Languages in the UI                                                                                                                                     | English, Hindi-ready (all text in `src/lib/store/strings.ts`)                                                                              | `strings.ts`                             |
| Carry over WooCommerce customers, orders, products?                                                                                                     | **TODO (dictate)**                                                                                                                         | migration script                         |
| Who works the admin; is a role narrower than admin needed?                                                                                              | **TODO (dictate)**                                                                                                                         | `roles-and-access.md`                    |

When the user dictates values, update this table first, then the code constants and the seed.

## Decisions already made (don't re-ask)

Each entry has a date and the reason. When the user decides something new, add it here the same way.

- **Rebuild step by step** (2026-11-06). The store is rebuilt with this skill, one roadmap step per
  branch, not patched. Why: the old store was not built on the template, its checkout is a mock, and
  its schema can't hold real school sets (a set was one priced product).
- **Old code moves to `legacy/` in step 1** (2026-11-06). The new tables reuse names the old ones
  have (`products`, `schools`, `orders`, `addresses`), so the two can't run side by side. `legacy/`
  sits outside the build, so each step reads the old code there and ports what is worth keeping into
  new files. The old files stay (see "Old code is never deleted" below). The tag `old-store` keeps the
  old app runnable from git.
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
- **Old code is never deleted** (2026-11-07, dictated). Nothing under `legacy/` is removed, by any
  step, including step 10, and the `old-store` tag stays. Ported code is copied into new files. Why:
  the user wants the old design and logic always at hand to look at and port from; step 2 deleted the old
  navbar before the new one matched it, and it had to be restored. How: a step that replaces old code
  leaves the `legacy/` file as it is. Before a commit, check `git diff --diff-filter=D --stat` shows no
  deleted file under `legacy/`.
- **Every set line is the parent's choice** (2026-11-07, dictated: "full freedom for the customer").
  Any book or uniform piece can be unticked; only an empty selection is refused. Why: parents often
  have part of the list already. How: `model/store/setSelection.ts`; `setItems.isOptional` is not read.
- **Nothing shifts when its text changes** (2026-11-07, dictated). Why: a parent on a cheap phone
  taps where a button was; a label that changes width moves the target and looks cheap. How:
  `references/design.md` → "Rules that still win".
- **Phone and desktop are separate UIs; hover is back on desktop** (2026-11-07, dictated). Why: the
  user wants the old desktop feel (hover opens the mega menu) and phones get their own UI, so hover
  never blocks a phone. How: a mouse may open a panel on hover from `lg` up, but every panel also opens
  by click, tap and keyboard (`references/design.md`).
- **Don't overcomplicate; better, not copied** (2026-11-07, dictated). Port the old UI's idea, not its
  code: the old sliding box measured every panel, the new one stacks the panels and moves one box; the
  search keeps the old "the bar grows to hold the field and results" idea, improved.
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
- **Staging sign-in without a domain** (2026-11-07). With no domain yet, other people sign in with
  Google or TextBee SMS, not email. Why: Resend can't mail anyone but its owner until a sending domain
  is verified, and the user has no domain. A subdomain such as `mail.<the shop's domain>` is the
  cleanest choice once DNS access exists, because it doesn't touch the live site's own email.
- **Staging deploy order** (2026-11-06). Vercel was set up before step 2, so the client can see
  progress early; `docs/08-environments-and-deployment.md` is the checklist. Console OTP on staging is
  accepted only while the user is the sole tester.
- **Menu drawer and bar** (2026-11-07, dictated: "a hims like dialog sidebar", details left to
  Claude). The bar stays for browsing: on desktop, Schools and the categories keep their hover boxes.
  The drawer, from the menu button on every size, is for the journey (school, then class). Why: one
  rule for the whole bar (hover on desktop, "don't overcomplicate"), and the drawer gives phone and
  desktop the same guided path without a second set of triggers.
- **Delivery is zone-based, built for expansion** (2026-11-07, dictated; corrects an earlier wrong
  reading). Today the client delivers **inside Faridabad only**, "same day or 1 to 2 days", but he hired
  the rebuild to grow, so nothing may be hard-wired to one city. Delivery zones are data (pincodes, fee,
  free-delivery threshold, estimate, method local or courier); Faridabad is the first zone. Courier and
  AWB stay in the model (`shipments`) for zones that ship by courier. Why: opening a new area must be a
  new zone in the admin, not a code change. Cash on delivery **and** online payment are both offered. A
  customer can cancel until the order ships; after it arrives they can submit a return request.
  Delivery charges were left to Claude as "typical" (placeholders, to confirm with the client).
- **One drawer, from the right; logo left, menu right** (2026-11-08, dictated; replaces the left
  menu drawer plus separate cart drawer of steps 3b and 4). The bar reads logo, then (desktop) the
  hover triggers, then search, cart and menu; no user icon. Menu and cart are views of one drawer
  whose icon row (search, account or sign-in, cart, close) switches between them. Why: it is what
  was meant from the start (the old sidebar and hims work this way); two drawers felt like two apps.
  The account is a third view (dictated the same day): signed out, the sign-in form; signed in, the
  photo and "Hi, {name}", recent orders, saved addresses (add, edit, remove), Account settings
  (`/account/profile`), Dashboard for admins, Sign out. The footer's "My account" opens it.
- **Sets are customizable** (2026-11-08, dictated). On a set page the parent can change the copies
  per line, tick extra items (the school's other products and the stationery, placeholder source
  `EXTRAS_CATEGORY_SLUG` in `store/sets.ts`) that go in with the set, and come back from the cart's
  "Edit set" to change it ("Update cart" replaces that set's lines). Why: parents buy for more than
  one child, already have some books, and want the notebooks with the set.
- **Shop filters include School** (2026-11-08, dictated): the school's current set lines and its
  uniform pieces.
- **A magazine with neumorphic surfaces replaces soft layers** (2026-11-08, dictated with reference
  screenshots: "a magazine like neo morphism"; built on branch `ui-refresh` before step 8). Whole
  app: store, admin, sign-in and account; the template's admin users and organizations screens only
  pick it up through the shared utilities. Full-width rounded chapters in the brand's teal (ink) and
  burgundy (wine) plus warm paper and saffron; editorial type in one self-hosted display font
  (Manrope, about 25 KB, headlines only); surfaces the colour of the page, raised or pressed in, light
  from straight above. No professional photos yet, so every photo spot is a `Media` placeholder slot
  (`docs/10-ui.md` lists them). Why: a premium magazine feel, and photos can be dropped in later
  without layout changes. How: `palette.css` (one palette per chapter), `app.css` (`chapter-*`,
  `type-*`, `rail`, neumorphic `raised`/`sunken`/`floating`), `Media.svelte`, `PageHead.svelte`.
- **CSS is nested, element.class, with short `@apply` lines** (2026-11-08, dictated: "modern nested
  css ... for human readability"; the user chose to keep `@apply`). No utilities in markup. Why:
  people read the styles. How: AGENTS.md conventions, `docs/10-ui.md`.
- **The nav bar follows the screen only on the home page; elsewhere it rests in the page and
  peeks on scroll up** (2026-11-09, dictated twice the same day; the second time replaced "hides
  only on product grids"). At the top of every shop page the bar lies flat (the page colour, no
  shadow); hovering its items keeps it flat. On the home page it stays at the top of the screen and
  the floating colour and shadow fade in with the first ~48px of scroll. On every other page it
  scrolls away with the page and stays flat while it does ("the navbar should not even move");
  once it is out of sight, scrolling up slides it in from the top, raised, until the page scrolls
  down again. The filter and sort dock sticks to the bottom of the screen only while the listing is
  under it and rests at the listing's end, never over the footer. Why: room to browse products on
  every page where people browse, and a dock that hints there is more to scroll without covering
  the footer. How: `NavBar.svelte` (`home`, `peek`, `lift`), `ProductListing.svelte` (`div.dock`).
  Desktop side panels that stick under the bar (product gallery `md:top-24`, cart and checkout
  summaries `md:top-28`) keep their offset, so they sit lower than needed while the bar is away.
- **Floating things have no glow above** (2026-11-09, dictated: "Its floating so it should not
  illuminate the surface below with reflected light the way a non floating tile would"). `shadow-l`
  (used only by `floating`: the nav bar, drawer, dialogs, menus, docks) casts shade below and no
  `--neu-light` glow; raised tiles and buttons keep theirs. Why: the glow is light bouncing off the
  page beside a tile that rises out of it; something clear of the page only shades it. How:
  `src/themes/palette.css`.
- **Controls on a floating surface lie flat** (2026-11-09, dictated: "navbar and side bar are
  already one level up so buttons look odd embossed make them flat and engraved on interaction").
  The nav bar's search, cart and menu buttons are raised while the bar lies flat on the page; once
  it floats they lose their gradient and shade (no outline either: the user tried one and dropped
  it), and sink in (`sunken`) when pointed at or pressed. The drawer's buttons always look like that: close, the
  icon row, the sign-in card, a school's chips and class tiles, the cart steppers and "View cart".
  Coloured buttons, the Continue card and cards that are not controls stay as they were. Why: keep
  the levels honest, page, then floating surface, then its controls on it. How: `flat` in
  `src/app.css`, `afloat` on `NavBar`, `CartList` and `Button`.
- **One Continue card, which can be hidden** (2026-11-09, asked for: the two cards "spawning
  multiple instances" with no way to remove them). The menu shows the last set opened, with a cross
  to hide it; it comes back when a set is opened again. How: `recentSets.ts`, `MenuDrawer.svelte`.
- **Step 7 is built in four sub-steps on one branch, one PR** (2026-11-08, dictated: "all sub
  steps will be merged in a single pr"): 7a products, stock and import; 7b schools and sets; 7c order
  board, orders and shipping; 7d settings, each in its own commits on `step-7-admin`. Why: the
  user reviews and merges the admin as one piece. `/admin` opens on Products until 7c puts the
  order board there.
- **Couriers are a placeholder list** (2026-11-08, chosen by the user): India Post, DTDC,
  Delhivery, Blue Dart and Other (free text), with tracking-link templates in
  `model/store/couriers.ts` (7c). The client is to confirm which couriers the shop uses.
- **The import never chooses a GST rate** (2026-11-08). The billing software's combined tax
  categories ("GST 12 to 5%") don't name one rate, so such a row is an error until the sheet or
  the product says which. Why: tax rates are the CA's call (`admin.md`).
- **Invoice is issued when the order ships** (2026-11-09, chosen by the user; replaces "when paid"). Same rule for online and cash-on-delivery orders. Why: the invoice can go in the parcel, and orders cancelled before shipping never use up a number, so no credit notes are needed yet. How: `transitionOrder` calls `issueInvoice` (`model/store/invoices.ts`).
- **Client questions go through the user** (2026-11-06). Ask the user when a step needs an answer;
  they get it from the client. Don't batch questions far ahead of the step that needs them.

## Roadmap

The agreed order. Each step is one branch (`step-<n>-<short-name>`) and one PR. A session works on the
first step that is not **built**. "Needs" lists what the client must provide: ask for it early, because a
real client takes days to answer. Where it isn't there yet, build with a named placeholder constant and
list it in the report.

**UI in every step:** read `references/design.md` first. Screens take their content and structure
from the live aggarwalkart.in and their look from `legacy/`, in the hims + Apple direction. "_Look
from_" names the `legacy/` files a step reproduces in that style; they stay in `legacy/`. A step isn't done
until its screens follow `design.md`; the step's PR names any deliberate departure.

0. **Foundation** (**built**, 2026-11-06). SvelteKit 3, template auth, palette, docs, CI.

1. **Clear the ground and lay the store's base** (**built**, 2026-11-06).
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
2. **Catalogue** (**built**, 2026-11-07). Categories, product pages, search (title, author, ISBN), URL filters; ports
   `legacy/src/lib/shop/filters.svelte.ts` and the search text builder. Also the app shell, navigation bar,
   home page and footer from `design.md`: the live site's sections (schools grid, three promises,
   contact, footer links) in the old UI's style. The nav has a tap-to-open mega menu (schools, books,
   uniforms, stationery), a search panel and a slide-out sidebar (its cart panel waits for step 4).
   _Look from_: `legacy/src/components/{app,navbar,sidebar}/`, `legacy/src/lib/{navbar,sidebar}/`,
   `legacy/src/components/shop/{product-view,filters-bar,filters-sidebar}.svelte`,
   `legacy/src/routes/(app)/(home)` and `shop/`. _Needs_: the real category list and an export of the
   current WooCommerce products (CSV), even rough.
3. **School sets** (**built**, 2026-11-07). `/schools`, school and class pages, the set page with optional lines, session label,
   and uniform sets with a size picker per line, as a guided flow (school, class, books or uniform,
   sizes; `design.md`). _Look from_: `legacy/src/components/shop/bundle-view.svelte`,
   `legacy/src/components/sidebar/school.svelte`. _Needs_: each school's book list per class for the current session (photos or PDFs are fine), which
   items are optional, and whether covering or labelling is offered.
   - **3b. Menu drawer** (**built**, 2026-11-07, branch `step-3b-drawer`). The hims-style floating
     drawer for the menu, on every screen size. _Needs_: nothing.
4. **Cart** (**built**, 2026-11-07, branch `step-4-cart`). Guest and signed-in, merge on sign-in, cart sheet and `/cart`. _Look from_:
   `legacy/src/components/sidebar/cart.svelte`, `legacy/src/lib/cart/`. _Needs_: nothing.
5. **Checkout and orders** (**built**, 2026-11-07, branch `step-5-checkout`). Addresses, `priceCart`, `placeOrder` (reprice, hold stock), `transitionOrder`,
   `/orders`, cancel. Recommended here: set up Playwright with one checkout spec against dev
   (`docs/09-testing.md`). _Look from_: `legacy/src/components/checkout/`, `legacy/src/routes/(app)/user/`.
   _Needs_: shipping fee and free-shipping threshold, COD yes or no,
   cancellation window, delivery estimate wording.
6. **Razorpay** (**built**, 2026-11-08, branch `step-6-razorpay`; `payments.md`). _Needs_: the client's Razorpay account; test keys and the webhook secret
   on dev; KYC and live keys before launch.
7. **Admin** (**built**, 2026-11-08, branch `step-7-admin`, four sub-steps 7a to 7d in one PR; see Decisions). Products, stock and import (port `legacy/src/lib/products/import.ts`), then schools and
   sets (with "copy to next session"), then the order board and shipping (`shipping.md`), then
   `/admin/settings`. _Look from_: `legacy/src/components/dashboard/`, `legacy/src/routes/(app)/dashboard/`.
   _Needs_: who works the admin, the courier(s) used, the real store details typed
   into settings by the client.
8. **Invoices and packing slips** (**built**, 2026-11-09, branch `step-8-invoices`). Sequential numbers per financial year; port `legacy/src/lib/pdf/`.
   `src/lib/assets/invoice-26.pdf` and `packing-slip-2826.pdf` are **invented samples**, not real
   orders (confirmed by the user 2026-11-09): reference for the layout. Their phone, GSTIN and address
   are made up, so they need no scrubbing.
   _Needs_: the CA's answer on GST (registered, scheme, rates, "Tax invoice" or "Bill of supply"), legal
   name and address, invoice prefix.
9. **Product On Demand** (**built**, 2026-11-09, branch `step-9-product-on-demand`). Form, `enquiries`, email to the store, admin inbox. _Needs_: what the store
   promises after an enquiry, which address receives it.
10. **Policies, SEO and launch readiness.** Policy pages (text from the live site, checked by the
    client), sitemap, 301 map from the WooCommerce URLs, and `docs/launch.md`: the checklist for
    launching from the separate production repo (new Convex and Vercel projects, env vars, Razorpay live
    keys and webhook, Resend domain for aggarwalkart.in, DLT for SMS OTP, data migration if wanted, DNS
    cutover with a rollback plan). Keep `legacy/` and the `old-store` tag. _Needs_: the policy texts,
    the go-live date, who owns the production accounts, domain and DNS access, the WooCommerce data
    export.

## Status (what exists)

Steps 0 to 9 are built (step 9: 2026-11-09, branch `step-9-product-on-demand`). **Next: step 10 (policies, SEO and launch readiness).**

**UI refresh** (2026-11-08/09, branch `ui-refresh`, before step 8): the magazine and neumorphism look
and nested CSS across the store, admin, sign-in and account (Decisions). New: `Media.svelte` (photo
slots), `PageHead.svelte`, chapter palettes and `type-*`/`rail` utilities, the Manrope display font.
No functions or data changed. Follow-ups on 2026-11-09, all in Decisions: selects got their arrow
back (`control` draws it over the surface) and the shop's filter and sort dock is sticky inside the
listing (PR #25); one Continue card that can be hidden, and floating surfaces with no glow above
(PR #26); the nav bar follows the screen only on the home page and elsewhere rests in the page and
peeks on scroll up, and controls on floating surfaces (the floating bar, the drawer) are `flat`
(branch `fix-navbar-peek`). No e2e tests exist yet (`docs/09-testing.md`); offered as its own
branch.

- **Old store**: in `legacy/` (not built, linted or type-checked); tag `old-store` runs it.
- **Tables**: all of `data-model.md`. Every product has one or more `productVariants` holding price and
  stock (books: one `Default`; uniforms: one per size, house T-shirt per size and house). Uniform
  products carry school, gender, uniform type, part and class range; `schoolSets` are `books` or
  `uniform`. Classes are numbers (`model/store/classes.ts`, Mont-01 = -2).
- **Functions**: `store/access.ts#myRoles` (public), `store/admin/stock.ts#adjust` (admin),
  `store/seed.ts#run` (internal; dev already seeded: 6 schools, categories, 20 books, 6 stationery
  items, a full demo uniform range for Ryan, a Class 1 book set and a "Boys regular, Class 1 to 5"
  uniform set). Guards in `model/store/access.ts`; `adjustStock` in `model/store/stock.ts`, used by the
  seed too, so the stock log is complete from the start.
- **Tests**: `store/harness.testutils.ts` signs in real Better Auth rows (signed out, two customers,
  admin); `store/access.test.ts` covers stock refusals, logging and never-below-zero. convex-test
  needs the module glob at the Convex root: `modules.testutils.ts`.
- **UI**: a bare home page and `src/lib/store/ShopHeader.svelte` (stand-ins until step 2).
- **Staging is live** (2026-11-06): a Vercel project (Hobby, SvelteKit) deploys `main`, with
  `PUBLIC_APP_ENV=staging`. Its backend is this repo's Convex **Production** slot. Convex env vars set
  there: the Better Auth secret, host and URL; `ADMIN_USER_IDS` (the owner); phone sign-in by real SMS
  through TextBee (`OTP_CHANNELS=textbee`, `TEXTBEE_API_KEY`; sign-in depends on one Android phone
  being online; `OTP_ALLOW_CONSOLE` was removed); Google sign-in (`GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`; the Google consent screen is in **Testing** mode, so only listed test users
  can sign in). `RESEND_API_KEY` is set, but `EMAIL_SEND_FROM` isn't: there is no domain yet, so Resend
  only mails its account owner and email sign-up can't work for anyone else. Staging has no demo data
  until the seed is run with `--prod`, which needs the user's say-so in that session. Deployment
  names and ids are in the dashboards, not here (public repo). To lock out nobody if SMS fails:
  `OTP_CHANNELS=console` plus `OTP_ALLOW_CONSOLE=true` brings back log-based codes.
- **Linking Google to a phone user** (2026-11-07, PR #5). A phone-only user's email is a
  `...@phone.invalid` placeholder. When Google is linked, the user takes Google's verified email in
  its place (`model/auth/linkedEmail.ts`), so the email step of sign-in recognises them. A real email
  is never replaced, and an email another user already has is left alone. Google is a trusted provider
  (a Google sign-in with an existing user's email joins that user). Known gap: an account with only
  Google still gets a password prompt in the email step; it should offer Google or an email code.
- **Step 2, catalogue** (built on the seed data; the client's real categories and WooCommerce CSV are
  still not in). Public queries in `store/catalog.ts`: `listCategories`, `listSchools`, `listProducts`
  (paginated, newest first), `getProduct`, `search`, `getContact`. They return only the shapes in
  `model/store/publicProjection.ts` (no stock number, no purchase price; hidden products, variants and
  categories never appear). Routes (all public): `/`, `/shop`, `/shop/[category]` (a parent category
  includes its children), `/shop/[category]/[slug]`, `/shop?q=` search, `/policies/[slug]` (a "being
  prepared" stub for the eight policies; the texts are step 10). Shell: floating nav bar, a
  slide-out menu (categories and schools; it is the mega menu, one panel on every screen size) and a
  search sheet, all opening on tap, plus the footer. Routes live in the `(shop)` group, so `resolve`
  takes `'/(shop)'`, `'/(shop)/shop'` and so on.
  - Filters (class, price, in stock) are a plain GET form and apply to the page that was read, so a page
    can come back short; "Show more" continues. Price sorting and a subject filter are not in: they need
    price and stock on the product (the model keeps them on variants). Revisit with the real catalogue.
  - Schools are shown but not linked until step 3. No cart, Product On Demand, Contact or About links yet.
  - Tests: `store/catalog.test.ts` (hidden things stay hidden, stock is never exposed).
  - Ported from `legacy/`: navbar, sidebar, `lib/shop/*`, the old home and shop pages,
    `productSearch.ts`. Step 2 deleted them and they were restored the same day; they stay for good.
- **Navbar rebuilt in the old style, with hims and Apple polish** (2026-11-07, PR #9 merged, then PR #10 on
  branch `step-2c-navbar-search`,
  dictated: "old navbar and hims and Apple combine", "don't overcomplicate", "phone and desktop are
  separate UI so hover is back"). Desktop (`lg` up): the floating rounded bar with Schools and each
  top-level category as triggers. They open on hover (mouse, short delay) and on click, tap or Enter.
  All panels sit stacked in one box (as tall as the tallest, so it never resizes); only its position
  glides to sit under the active trigger, with a small arrow. Admins get a Dashboard link. Phone: a
  compact bar whose menu button opens the sheet. The Schools panel lists schools without links until
  step 3.
  - **Search** (dictated: "the navbar grows in height to hold the input and its results", made better
    than the old one, not copied). The search icon opens the field inside the bar, which slides taller,
    then grows and shrinks smoothly with the results. Results: matching categories, products with cover,
    title, author or category and price, the typed words highlighted, and "See all results". Before
    typing: recent searches (this device only, `localStorage`) and quick links. 200 ms pause before
    searching, skeleton rows while loading, arrow keys move through results, Escape closes.
    Fixed 2026-11-07 after the user saw it stagger and push the page: one height animation drives the
    open, the close and every results change (recent searches are read before the first frame), and the
    header keeps the collapsed bar's height while the bar floats over the page, so growing never moves
    the content below.
  - The old code stays in `legacy/`. Cart icon waits for step 4.
- **Step 3, school sets** (built on seed data; no real school lists yet). Public queries in
  `store/sets.ts`: `listForSchool(schoolSlug)` (active sets of the current session, from
  `storeSettings.currentSession`) and `getSet(schoolSlug, setId)` (lines; a book line has its one
  size, a uniform line every active size). Hidden schools, sets, products, categories and sizes never
  appear, nor do other sessions or stock numbers (`store/sets.test.ts`). Routes (public): `/schools`,
  `/schools/[school]` (guided steps kept in the address: `?for=books|uniform&gender=&type=`, so Back
  works), `/schools/[school]/[set]` (the set's database id is in the URL). The set page
  (`SetPicker.svelte`) ticks every line, shows a size picker for uniform pieces, and a sticky total;
  maths in `model/store/setSelection.ts` (a line counts only if ticked, sized and in stock). **Add to
  cart is disabled until step 4.** The nav menu, sheet and home grid now link to schools. Seed:
  `store/seed:addDemoSets` adds Class 2 books and a girls' regular uniform set to an already seeded
  deployment (the seed itself calls the same code). The step's `isOptional` column is stored but
  unused by the UI, since every line is untickable.
- **Step 3b, menu drawer**. `Drawer.svelte` is a floating rounded card over the page (Bits UI
  Dialog: focus trap, Escape, scroll lock), from the left now and from the right for the cart in
  step 4. `MenuDrawer.svelte` has a back stack whose views slide in and back: menu (Continue card,
  Schools and each category in large type, All products, help, sign-in or account and Dashboard),
  schools, a school (`MenuSchool.svelte`: book set or uniform tabs, then gender and type chips, then
  the class tiles, loaded with `listForSchool` on the client), and a category's sections plus "View
  all". It replaced the phone sheet; the menu button sits first in the bar on every size. Help shows
  WhatsApp only when a number is set (a 10-digit number gets 91) and two policy links. The set page
  remembers the last set on this device (`recentSets.ts`, `localStorage`) for one Continue card, which
  the parent can hide (2026-11-09: two cards looked like duplicates and could not be dismissed).
  No backend change.
- **Step 4, cart** (built on seed data). `store/cart.ts`: `getCart` (`requireCustomer`), `getGuestCart`
  (deliberately public: prices a guest's lines, stores nothing), `setLines` (replaces the cart, the
  client sends the whole list) and `mergeGuest` (adds guest lines on sign-in). Every line is checked
  against the catalogue: hidden or unknown variants drop out, quantity is clamped to the shelf and to
  `MAX_LINE_QUANTITY`, lines to `MAX_CART_LINES` (`model/store/cart.ts`, **placeholders 10 and 20,
  TODO (dictate)**). Out-of-stock lines stay but are not in the subtotal. The cart reserves no stock:
  that is `placeOrder` in step 5. Client: `cart.svelte.ts` (context set in the `(shop)` layout; guest
  lines in `localStorage` key `aggarwalkart:cart`), `CartDrawer` (from the right), `CartList`,
  `CartSummary`, `/cart` (public). Add to cart works on set pages (ticked, sized, in-stock lines with
  `fromSetId`) and product pages (size picked first). Checkout button is disabled until step 5.
  Tests: `store/cart.test.ts`.
- **Filter and sort dock** (2026-11-07, dictated: filter and sort "at the bottom with a fading top
  edge"). `ProductListing.svelte`: a floating pill at the bottom opens a filter sheet (the old GET form)
  and a sort sheet (`?sort=new|price-asc|price-desc|title`). Sorting reorders only the products already
  loaded, because price is on variants; real price sorting needs a price on the product. Search results
  show Sort only.
- **Catalogue data**: the staging page `/shop/book` of the earlier store showed ~47 titles with prices
  ₹148 to ₹650 and publishers (Saar, SP, S Chand, PP) only inside titles: no authors or classes. Nothing
  imported; the WooCommerce CSV is still needed.
- **Step 5, checkout and orders** (built on seed data). Delivery is **zone based**: `deliveryZones` +
  `zonePincodes` (`model/store/delivery.ts#findZone`: the zone listing the pincode, else the active
  fallback zone; none means "we do not deliver there yet"). Seed zones are placeholders: **Faridabad**
  (local, ₹40, free from ₹500, "Same day or within 1 to 2 days", pincodes 121001 to 121010, **list to
  confirm**) and **Rest of India** (courier, ₹79, free from ₹999, "3 to 7 business days after
  dispatch"). Add a zone later with a new row (admin screen in step 7); `store/seed:addZones` adds the
  two to an already seeded deployment. Functions: `store/addresses.ts` (list, save, remove; max 10),
  `store/checkout.ts#preview` (the cart priced for an address), `store/orders.ts` (`placeOrder`,
  `myOrders`, `getOrder`, `cancelOrder`, `requestReturn`), all `requireCustomer`. `placeOrder`
  re-reads the cart and prices it with `model/store/pricing.ts#priceCart`, refuses the whole order
  if any line is short, holds stock through `adjustStock` (reason `order`), snapshots the lines,
  address and zone, and empties the cart; it is rate limited per customer (5 per 10 minutes). All
  status changes go through `model/store/orders.ts#transitionOrder` (idempotent; cancel puts stock
  back; cash on delivery is marked paid on delivery). Cash on delivery orders start `confirmed`.
  **Pay online is shown disabled** (`ONLINE_PAYMENT_ENABLED = false` in `storeProfile.ts`) and the
  server refuses it until step 6 turns it on and adds the payment-window expiry and the refund on
  cancelling a paid order (marked TODO in `transitionOrder`). Routes (private): `/checkout`, `/orders`,
  `/orders/[number]` (status timeline, cancel until it ships, return request after delivery inside the
  window; a local zone reads "Out for delivery", a courier zone "Shipped" with courier and tracking
  number once step 7 writes a `shipments` row). Cart's Checkout button now links to `/checkout`; the
  menu drawer has "My orders". Tests: `store/orders.test.ts`, `model/store/pricing.test.ts`.
- **Shop UI fixes** (2026-11-08, branch `fix-shop-ui`). One right-hand drawer
  (`drawer.svelte.ts` context, `MenuDrawer.svelte`; `CartDrawer.svelte` removed), the new bar
  order, the school filter (`listProducts` `schoolSlug`, `model/store/schools.ts`), set quantities,
  extras (`store/sets.ts#listExtras`) and edit-from-cart (`cart.replaceSet`). Two bugs were class-name
  collisions: the menu's `.back` button style also hit the view sliding `back` (items centred), and
  `MegaPanel`'s `.panel` picked up the global `panel` utility (a card inside the dropdown card); the
  dropdown's parts now share one duration and curve. Tests: `setSelection.test.ts`, school filter in
  `catalog.test.ts`.
- **Home page** (2026-11-08, branch `home-page`, on top of `ui-soft-layers`). The live site's content
  with inventre.in's layout ideas (nothing copied, no ratings or testimonials: none are known; a
  scrolling ticker was tried and removed on request): hero with two calls to action and a facts row, schools grid
  with monograms and "Buy book set", How it works in three steps, what is in a set, categories ("Learn
  from the best"), four trust badges, a closing band and the contact block. `getContact` also returns
  `currentSession`. All text is in `strings.home`.
- **Step 6, Razorpay** (2026-11-08). Online payment is offered wherever `RAZORPAY_KEY_ID` and
  `RAZORPAY_KEY_SECRET` are set (`model/store/razorpay.ts#onlinePaymentReady`; it replaced the
  `ONLINE_PAYMENT_ENABLED` constant). Dev has test keys; staging has none, so it stays cash on
  delivery. Talks to Razorpay's REST API with `fetch` and Web Crypto (no Node action, the `razorpay`
  npm package is unused). `store/payments.ts`: `start` (action; guard `requireCustomer` inside
  `beginAttempt`; saves the `payments` row `creating`, then `created` with the gateway order id;
  reuses an attempt for the same amount; at most 10 per order), `confirm` (public on purpose: needs
  a signature made with our secret and a server-side status check that says `captured`),
  `handleEvent` (webhook, deduplicated on the event id in `paymentEvents`), `expire` (scheduled by
  `placeOrder` for 30 + 5 minutes), `sendRefund`. The webhook is `/razorpay-webhook` in `http.ts`
  (`model/store/paymentWebhook.ts`). `model/store/payments.ts#settleCapture` is the one place money
  turns an order paid; a capture for a cancelled or already paid order, or the wrong amount, never
  does (late money is refunded, a wrong amount is logged). `model/store/refunds.ts#startRefund`
  refunds a payment at most once; `transitionOrder` calls it on cancelling a paid online order. A
  refund the gateway refuses is marked `failed` for the shop to settle by hand (no retry).
  `store/admin/payments.ts`: `checkSetup` (missing env var names, webhook URL) and `list`; their
  screens come in step 7. UI: checkout opens Razorpay Checkout (script loaded only then,
  `src/lib/store/pay.ts`); the order page shows "Pay ₹X" with the deadline, the refund state and
  "Online, not paid yet". Tests: `store/payments.test.ts`. **Dev webhook**: the user is to set
  `RAZORPAY_WEBHOOK_SECRET` and add the webhook in Razorpay (docs/08); until then refunds stay
  "started" and late captures are not seen.
- **Plain buttons set their own text colour** (2026-11-08): `Button.svelte` plain variant had
  inherited the parent's colour, so the home page closing band's buttons were invisible.
- **Step 7a, admin products** (2026-11-08). `/admin` is now a layout (admin check, then
  `AdminShell`: rail on tablet and up, top bar on phones) and redirects to `/admin/products` until
  7c; the template's users dashboard moved to `/admin/users`. Functions (all `requireAppAdmin`):
  `store/admin/products.ts` (`options`, `list` paginated with category, status and low/out-of-stock
  filters, `search`, `get` with exact stock, what open orders hold and the last 20 changes per size,
  `create` with a first size at zero stock, `update` (slug never changes; a replaced photo is
  deleted), `setActive`, `saveVariant`, `imageUploadUrl`, `exportPage` for the CSV),
  `store/admin/stock.ts` (`adjust` now only Received (+) and Damaged (−); `count` sets stock to the
  count minus what unshipped orders hold, and is refused if stock moved since the screen showed it),
  `store/admin/import.ts` (`plan`, `apply`). Rules shared by form and import:
  `model/store/products.ts`; the planner: `model/store/importPlan.ts` (match on item code, else
  barcode; blank cell keeps the value; stock mode keep, add or set; rows with errors skipped; the
  apply refuses if the plan's fingerprint changed since the preview; max 500 rows; new rows need a
  category picked on the page, kind is book for HSN 4901 else stationery). Schema: optional
  `purchasePrice` on variants (admin only), indexes `productVariants.by_stock` and
  `orderItems.by_variantId`. Client: `src/lib/store/admin/*` (sheet parser ported from
  `legacy/src/lib/products/import.ts`, `xlsx` loaded only on the import page). `src/routes/admin`
  is no longer on the lint and Prettier ignore lists. Tests: `store/adminProducts.test.ts`.
- **Step 7b, schools and sets** (2026-11-08). `store/admin/schools.ts` (`list` with set counts,
  `get`, `create` hidden with a fixed slug, `update`, `move`) and `store/admin/sets.ts` (`sessions`,
  `listForSchool`, `get`, `create` hidden, `update` (type never changes), `setActive` (publish refused
  for an empty set or one with hidden lines), `addLine`/`updateLine`/`moveLine`/`removeLine` (book sets
  take no uniform pieces; uniform sets only their own school's), `copyToSession` (copies hidden;
  refused if the target session has sets)). Rules: `model/store/setRules.ts`. Routes:
  `/admin/schools`, `/admin/schools/[id]`, `/admin/schools/[id]/sets/[setId]`. Tests:
  `store/adminSets.test.ts`.
- **Step 7c, orders and shipping** (2026-11-08). `/admin` is the live order board (awaiting payment,
  to pack, packed, latest 50 shipped; today's orders and revenue in IST, computed on the client).
  `store/admin/orders.ts`: `board`, `list` (paginated by status), `search` (exact order number, else
  name or phone in the latest 300), `get`, `markPacked`, `markShipped` (a courier zone needs courier
  and AWB; one shipment per order; sends the shipped email via `model/store/shippedEmail.ts`, skipped
  for `.invalid` emails or without `EMAIL_SEND_FROM`), `markDelivered`, `cancel` (stock back once,
  refund if paid online), `answerReturn` (the refund itself is done by hand for now). Couriers:
  `model/store/couriers.ts`. Routes: `/admin`, `/admin/orders`, `/admin/orders/[number]`,
  `/admin/shipping` (packed orders with the ship form). Tests: `store/adminOrders.test.ts`.
- **Step 7d, settings** (2026-11-08). `/admin/settings`: shop details and rules
  (`store/admin/settings.ts` `get`/`save`; format checks only: Indian mobile, email, GSTIN shape,
  invoice prefix 1 to 3 letters, return window 0 to 30 days, session like 2026-27; a confirm before the
  session changes), the "Taking orders" switch, delivery zones (`store/admin/zones.ts` `list`,
  `pincodes`, `save` (making a zone the fallback takes it off the others; a confirm before leaving no
  active fallback), `setPincodes` (refused if a pincode is in another zone)), and the Razorpay setup
  check and recent payments (`store/admin/payments.ts`). The payment window stays a code constant.
  Tests: `store/adminSettings.test.ts`, plus "taking orders off" in `store/orders.test.ts`.
- **Step 8, invoices and packing slips** (2026-11-09). `orders.invoice` (number, financial year, issue time, seller and `taxByRate`, all frozen) is written by `model/store/invoices.ts#issueInvoice` when an order ships; the number is `PREFIX/26-27/0001` from `invoiceCounters` (April to March, IST), or `26-27/0001` with no prefix. `orderItems.setLabel` (set and school as written at order time) groups lines on both documents. `model/store/pricing.ts#taxByRateOf` is shared by checkout and the invoice. `model/store/orderDocument.ts` builds the data: `store/orders.ts#invoiceDocument` (customer, own order), `store/admin/documents.ts` (`invoice`, `packingSlip`, `packingSlipsToPack`, all `requireAppAdmin`). The packing slip has no price field. PDFs are drawn in the browser (`src/lib/store/pdf/`, pdfmake loaded on tap, `PdfButton.svelte`, `documents.ts`), ported from `legacy/src/lib/pdf/`; the seller is read from settings, not a constant. Buttons: customer order page, admin order page, shipping page, board's To pack column. Settings shows a notice while legal name or address is empty. Tests: `store/invoices.test.ts`, `model/store/invoices.test.ts`. Placeholders: title "Invoice", no CGST/SGST/IGST split, no tax on delivery, no logo, COD amount not on the slip. Not built: credit notes.
- **Step 9, Product On Demand** (2026-11-09). `/product-on-demand` (public, in `isPublic`): book name, author, class, name, phone, email. `store/enquiries.ts#submit` is deliberately public: it validates (`model/store/enquiries.ts`; phone to +91, class from `CLASS_OPTIONS`), is rate limited per phone (3 an hour) plus 60 an hour for the whole shop (`enquiryRateLimiter`; Convex cannot see an IP), files an `enquiries` row numbered `EQ-XXXXXX` (`model/store/numbers.ts`, shared with order numbers) and emails the shop email from settings (skipped when it or `EMAIL_SEND_FROM` is empty; a send failure never loses the enquiry). The confirmation shows the number and `ENQUIRY_PROMISE` (`storeProfile.ts`, placeholder). Staff: `/admin/enquiries` (New / Quoted / Closed, note, count badge on the rail; `store/admin/enquiries.ts`, all `requireAppAdmin`). Links in the footer and the menu drawer's Help. Tests: `store/enquiries.test.ts`. Not done: prefilling name and phone for a signed-in parent; the email is not sent to the customer.
- **Not in yet**: policies and launch
  (10). The settings row still holds placeholders until the client types the real details in.

When a step lands, mark it **built** in the roadmap with the date, write what was built here in a few
lines (routes, main functions, anything surprising), and move "Next" on.
