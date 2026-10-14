# Project status

Last updated: 2026-10-14

## Current state

| Milestone | State |
|---|---|
| M1 Foundation and brand | **Done** (Designer approved on re-review; Tester 124 passed / 0 failed after the skip-link fix) |
| M2 Catalogue and cart store | **Done** (Tester 177 passed / 0 failed; Designer re-review approved CR 1-4; CR 5-6 deferred to M4) |
| M3 Cart, checkout, confirmation | **Done** (Tester 239 passed / 0 failed / 7 skipped; Designer re-review approved CR 1-7; CR 8-9 deferred to M4) |
| M4 Friction flags (local) | Next |
| M5-M7 | Not started |

The repo has git history: initial commit `a3850bc` (through M3), then the M3 review fixes (CR 1-7) and docs in a follow-up commit.

### M2 Catalogue and cart store

- Done: homepage, PLP sort, full PDP, cart store, header count, mini-cart drawer, `lib/pricing.ts`. Details in `docs/FEATURES.md`.
- Designer re-review: **APPROVED** (CR 1-4 done: desktop thumbnail rail, shorter mobile tiles, distinct tile art, 2-column newsletter).
- Open nice-to-haves, deferred to M4: CR 5 (size-chip error border, `SizeSelector.tsx`), CR 6 (sticky PDP gallery column, `PurchasePanel.tsx`).

### M3 Cart, checkout, confirmation

- Done (details in `docs/FEATURES.md`, code map in `docs/ARCHITECTURE.md`):
  - Cart page `/cart`: lines with quantity stepper and Remove, summary (subtotal, discount, shipping, total), free-shipping hint, promo `DEMO10` disclosure, empty state.
  - Checkout `/checkout`: demo banner, single-page form (contact, address, country, shipping method, payment), clean validation on blur and submit, live order summary, processing state (~1.5 s), order saved to sessionStorage `tw-last-order`, cart and promo cleared.
  - Confirmation `/confirmation`: `TW-` + 6-digit order number, email, lines, shipping method, totals; "No recent order" state.
  - Clean M4 hooks in place (`promoVariant`, `shippingDisplay`, `strictPostcode`, `onShippingChange`); they render the clean state until M4.
- Tester: **PASS**, 239 passed / 0 failed / 7 skipped (project-specific skips). See `docs/TEST_REPORT.md`.
- Designer: review requested CR 1-7 (`docs/DESIGN_REVIEW.md`), two must-fix:
  - CR 1 (must): the "Processing…" button settled to grey; it now stays accent with white text (`aria-busy:` classes in `components/ui/Button.tsx`).
  - CR 4 (must): `FIELD_ORDER` listed city before postcode, so submit focused the wrong field; now postcode, then city (`lib/checkout/validation.ts`).
  - CR 2 single promo-applied line, CR 3 `<dl>` divider, CR 5 token-only classes (new `xs` breakpoint, `accent-accent`), CR 6 minus icon when the promo disclosure is open, CR 7 named cart steppers.
- Builder fixed all seven. After the fixes: e2e re-run 239 / 0 / 7; `npm run lint`, `npx tsc --noEmit`, `npm run build` pass. Designer re-review: **APPROVED**.
- Open nice-to-haves, deferred to M4:
  - CR 8: below 360 px the stacked input collapses to about 20 px. Fix: `flex-1` -> `xs:flex-1` in `NewsletterSignup.tsx` and `PromoCode.tsx`.
  - CR 9: "Remove code" wraps at 390 px. Fix: `className="shrink-0 whitespace-nowrap"` on that Button in `PromoCode.tsx`.
- Blocked: nothing.

## Next steps

1. M4 Friction flags (local) per `docs/PLAN.md` section 10 (M4): `lib/flags/*`, `FlagsProvider`, all 9 behaviours, `?friction=` overrides, `/api/hero-image`. Fold in the deferred nice-to-haves: M2 CR 5-6 and M3 CR 8-9.
2. M5 Tracking, M6 Live toggles and control panel, M7 Hardening, polish, handover.

## Change log

- 2026-10-14: M3 done. Built cart page, promo, shipping/totals, checkout with validation and processing state, order save, confirmation and no-order state. Tester PASS 239/0/7. Designer requested CR 1-7 (must-fix CR 1 processing colour, CR 4 field focus order); Builder fixed all; e2e re-run 239/0/7, lint/tsc/build pass; Designer re-review approved. CR 8-9 deferred to M4. M2 re-review approved (CR 5-6 deferred to M4). Git initialised (initial commit `a3850bc`). Docs updated (STATUS, FEATURES, ARCHITECTURE, DECISIONS).
- 2026-10-14: M2 built (home, PLP sort, PDP, cart store, header count, mini-cart drawer, `lib/pricing.ts`). Tester PASS 177/0. Designer requested CR 1-4 (1 must-fix: desktop thumbnail rail); Builder implemented them; re-review in progress. M3 build started. Docs updated (FEATURES, ARCHITECTURE, DECISIONS, STATUS).
- 2026-10-14: M1 done. Designer re-review approved all 12 items; Tester re-run 124 passed / 0 failed (skip-link fix confirmed).
- 2026-10-14: M1 built (scaffold, tokens, shell, catalogue, SVG imagery, placeholders, Playwright). Designer review: changes requested (4 must-fix), Builder fixed them. Tester: 123 passed, 1 failed (skip link, since fixed). Docs created.
- 2026-10-14: Plan finalized with owner answers (`docs/DECISIONS.md`). Design tokens written.
