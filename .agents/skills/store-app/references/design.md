# Design: the real shop, in the new design language

Read before building or changing any screen. The new store **merges two things**:

1. **What the real shop is** (aggarwalkart.in, the live WooCommerce site): its content, structure and
   promises. Customers already know it, and the client built it.
2. **The design language the user was working towards** in the old local app (`legacy/`, run it with
   `git switch --detach old-store`): **hims.com + Apple**. That means calm, premium, uncluttered pages.

Take the **content and information architecture from the live site**, and the **look and interaction
from `legacy/`**, pushed further toward hims + Apple. The code is new: rebuild each screen on the new
tables, `src/lib/ui`, the palette and `strings.ts`. Never import from `legacy/`.

## From the live site (content and structure)

Checked 2026-11-06. Leave out contact details: they come from `storeSettings` (public repo).

- **Navigation**: Schools (all six, not only Ryan as on the live menu), Product On Demand, Contact,
  plus search, account and cart. Add Uniforms and Stationery, which the live site lacks.
- **Home, in this order**:
  - the one-line promise of what the shop sells
  - the **schools grid**, each tile leading to that school's sets ("Buy Books Set", which becomes books
    and uniforms)
  - the three promises **High Quality, Fast Delivery, Best Discount**
  - a short "chosen with care" block (the live "Learn From the Best")
  - contact (phone, WhatsApp, email and address from settings)
- **Footer**:
  - Account: Cart, Checkout, My Account
  - Useful links: About Us, Contact Us, Product On Demand, and the eight policies (Privacy, Terms &
    Conditions, Cancellation, Refund & Return, Shipping & Delivery, Payment, Grievance Redressal,
    Disclaimer)
  - the GST number (from settings, shown only when filled in)
  - copyright
- **Catalogue names**: Text Books, NCERT Books, Sample Papers, Entrance Exam Books, Language Books.
- **Copy**: keep the meaning of the live copy, but rewrite it in clean, plain English. The live text
  has typos ("best bellers") and empty superlatives. Don't invent new promises (discounts, delivery
  times): those are TODO (dictate).

## From the design language (look and interaction)

What `legacy/` already does, which the new screens keep:

- a **floating, rounded navigation bar** (squircle card on the page, soft shadow)
- a **mega menu** and an inline **search panel** that open from the bar
- a **slide-out sidebar** for schools, categories, cart and account on phones
- product and set views with generous space

What hims + Apple add:

- **Big, confident typography and lots of white space.** One idea per section, short headlines, and
  one clear call to action per screen.
- **Large, clean product imagery** on light layers, in rounded cards. Few borders; depth from the
  layers and soft shadows.
- **Guided choosing, as hims guides a visit.** For example: pick a school, then the class, then
  books or uniform, then sizes. Show one step at a time, with progress, and the total always visible.
  This is what the set and uniform flows (steps 3 to 5) should feel like.
- **Quiet motion**: short fades and slides, honouring `prefers-reduced-motion`.
- **Calm, honest copy**: plain sentences, no exclamation marks, no fake urgency.

## Rules that still win

- Our own name, palette (`src/themes/palette.css`) and copy. hims and Apple are **references for
  feel, never for branding**: no copied logos, images, text or trade dress.
- **A cheap Android phone on slow 4G comes first.** Phone and desktop are separate UIs (dictated
  2026-11-07): on desktop (`lg` up) a mouse may open the mega menu on hover, as a shortcut, but
  everything also opens by click, tap and keyboard; the phone UI has no hover at all. Nothing may
  need hover. Keep images small and lazy with fixed sizes, use skeletons, and use no heavy animation
  libraries.
- Components from `src/lib/ui`; `edge` utilities for borders and shadows; short semantic classes with
  Tailwind in `<style>` (AGENTS.md).
- All text in `src/lib/store/strings.ts`.
- **Nothing shifts when its text changes** (dictated 2026-11-07). A button or label that swaps text
  ("Show more" and "Loading") keeps one size: stack both labels in one grid cell and hide the inactive
  one. Prices and counts use `tabular-nums`. A control that appears on demand (a clear button) keeps
  its space while hidden. Skeletons take the real content's size (`bone`). Height may grow on purpose
  (the search results), but smoothly, never as a jump.
