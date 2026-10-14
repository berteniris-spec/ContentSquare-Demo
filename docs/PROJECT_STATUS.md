# Project status

Last updated: 2026-10-14

## Current state

| Milestone | State |
|---|---|
| M1 Foundation and brand | **Done** (Designer approved on re-review; Tester 124 passed / 0 failed after the skip-link fix) |
| M2 Catalogue and cart store | **Built; Tester PASS; Designer re-review in progress** |
| M3 Cart, checkout, confirmation | **Build in progress** (Builder) |
| M4-M7 | Not started |

### M2 Catalogue and cart store

- Done (details in `docs/FEATURES.md`, code map in `docs/ARCHITECTURE.md`):
  - Homepage: hero, 3 category tiles, Featured row (4), values strip, newsletter with inline validation and thank-you (no network).
  - PLP sort (Featured / price low-high / price high-low) via `?sort=` and `router.replace`, invalid values fall back to Featured.
  - Full PDP: gallery with thumbnails, colour swatches, sizes (none preselected, clean size error), quantity 1..10, Add to cart, sold-out and low-stock states, story, related products.
  - Cart store `lib/cart/` (localStorage `tw-cart-v1`, `useSyncExternalStore`, `useCart` / `useCartUi`), live header count, mini-cart drawer with focus trap.
  - Pricing rules in `lib/pricing.ts` (promo, shipping threshold, totals), ready for M3.
- Tester: **PASS**, 177 passed / 0 failed / 7 skipped (project-specific skips). See `docs/TEST_REPORT.md`.
- Designer: first review requested CR 1-4 (`docs/DESIGN_REVIEW.md`):
  1. Desktop thumbnails were below the fold: now a vertical thumbnail rail left of the main image from `lg` (must-fix).
  2. Shorter mobile category tiles (4:3 below `sm`).
  3. Category tiles use different art from the Featured row (Roll-top pack, Canvas overshirt).
  4. Newsletter 2-column layout on desktop.
  The Builder implemented all four (visible in the code); the Designer re-review verdict is pending.
- Blocked: nothing.

### M3 Cart, checkout, confirmation

- Builder is working on the cart page, promo, shipping/totals, checkout form and validation, processing state, confirmation and cart clear. Not documented until it ships.

## Next steps

1. Designer re-review of M2 (CR 1-4). Tester re-run if the re-review touches anything.
2. Finish M3 build, then Designer review, Tester run and docs per `docs/PLAN.md` section 10 (M3).
3. M4 friction flags (local).

## Change log

- 2026-10-14: M2 built (home, PLP sort, PDP, cart store, header count, mini-cart drawer, `lib/pricing.ts`). Tester PASS 177/0. Designer requested CR 1-4 (1 must-fix: desktop thumbnail rail); Builder implemented them; re-review in progress. M3 build started. Docs updated (FEATURES, ARCHITECTURE, DECISIONS, STATUS).
- 2026-10-14: M1 done. Designer re-review approved all 12 items; Tester re-run 124 passed / 0 failed (skip-link fix confirmed).
- 2026-10-14: M1 built (scaffold, tokens, shell, catalogue, SVG imagery, placeholders, Playwright). Designer review: changes requested (4 must-fix), Builder fixed them. Tester: 123 passed, 1 failed (skip link, since fixed). Docs created.
- 2026-10-14: Plan finalized with owner answers (`docs/DECISIONS.md`). Design tokens written.
