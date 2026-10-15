# Project status

Last updated: 2026-10-15

## Current state

| Milestone | State |
|---|---|
| M1 Foundation and brand | **Done** (Designer approved on re-review; Tester 124 passed / 0 failed after the skip-link fix) |
| M2 Catalogue and cart store | **Done** (Tester 177 passed / 0 failed; Designer re-review approved CR 1-4; CR 5-6 deferred to M4) |
| M3 Cart, checkout, confirmation | **Done** (Tester 239 passed / 0 failed / 7 skipped; Designer re-review approved CR 1-7; CR 8-9 deferred to M4) |
| M4 Friction flags (local) | **Done** (Designer APPROVED, no must-fix; Tester PASS 307 passed / 0 failed / 7 skipped) |
| M5 Tracking (incl. Google Analytics) | **Done** (Designer APPROVED, no change requests; Tester PASS 447 passed / 0 failed / 7 skipped) |
| M6 Live toggles and control panel | **Done** (Designer APPROVED, no must-fix; Tester PASS main suite 499 passed / 0 failed / 7 skipped, panel suite 66 passed / 0 failed / 2 skipped) |
| M7 Hardening, polish, handover | **Done** (Designer APPROVED; final Tester PASS: main 499 passed / 0 failed / 7 skipped, panel 74/0/2 after the focus fix, variants disabled/override/invalid 8 passed + 2 skipped each and dev Strict Mode 10 passed, defaults 18 passed; lint 0 warnings, tsc and build pass) |

**All milestones M1-M7 are done. Only the owner's manual steps below remain.**

Git: initial commit `a3850bc` (through M3), then `64797dc` (M3 review fixes and docs). **Nothing committed since**: M4-M7 work, the Vercel docs and plan changes are uncommitted in the working tree.

### Deployment (Vercel)

- Live: https://tidewild-demo.vercel.app (project `tidewild-demo`, scope `berteniris-spec`, GitHub-linked, pushes auto-deploy). Details in `docs/DEPLOYMENT.md`.
- Done: SSO deployment protection disabled, Production env vars set, Upstash for Redis provisioned and connected. Smoke check 200 on `/`, `/demo-controls`, `/product/field-tote`, `/cart`.
- Prod runs the **M3 build**: it does not include M4-M7 (nothing committed, pushed or deployed since M3). The owner decides when to commit and `vercel deploy --prod --yes` (steps in `docs/DEPLOYMENT.md` "Deploying M4-M7"). Until then GA, the Contentsquare tag and live toggles are not live there, and `/demo-controls` shows "not available yet". Post-deploy manual checks (GA4 Realtime/DebugView, Contentsquare consuming `_uxa`): `docs/DEPLOYMENT.md`.
- Owner to do: see "Manual steps for the owner" below.

### Manual steps for the owner

1. **Review and commit M4-M7.** Nothing has been committed since `64797dc`. Decide about the untracked `.agents/`, `.claude/skills/`, `skills-lock.json` (installed by the Upstash integration; commit or delete). `.gitignore` has a new `.claude/settings.local.json` line. Never commit `.env.local` or `.vercel/`.
2. **Push and/or `vercel deploy --prod --yes`.** Production still runs the M3 build (`docs/DEPLOYMENT.md` "Deploying M4-M7").
3. **Allow-list `tidewild-demo.vercel.app` in Contentsquare** (project settings; also check privacy settings, there is no cookie banner: `docs/TRAFFIC_GUIDE.md`).
4. **Post-deploy checks** (cannot be verified locally; checklist in `docs/DEPLOYMENT.md`): real Upstash persistence and latency; a flip reaching a new visitor within about 60 s; the panel API not cached; GA4 Realtime/DebugView (one page view per navigation, one purchase); Contentsquare consuming `_uxa` page views, `friction_*` and `order_value`; `/api/hero-image` weight (~1.73 MB, ~3 s) on Vercel.
5. **Keep `DEMO_CONTROLS_PIN` safe.** It was set as a sensitive Vercel env var. A plaintext copy exists in the Claude session scratchpad file; delete it, or rotate the PIN, if the machine is shared. The PIN is not in any repo file and must not be added.
6. **Optional:** set `NEXT_PUBLIC_GA_ENABLED=false` in `.env.local` so local runs do not hit the real GA4 property.
7. Then run the demo with `docs/DEMO_SCRIPT.md` and generate sessions with `docs/TRAFFIC_GUIDE.md` (the optional `scripts/traffic/` persona script was not built).

### M7 Hardening, polish, handover

- Done: backlog fixes, final docs (`DEMO_SCRIPT.md`, `TRAFFIC_GUIDE.md`, `DEPLOYMENT.md`, `README.md`, `CLAUDE.md`), shipped-default suite `npm run test:defaults` (`playwright.defaults.config.ts`, `tests-defaults/`). The optional `scripts/traffic/` script was **not built**.
- Designer: **APPROVED**. CR 1 (hero slow-visibility, empty frame until flags ready) fixed and re-approved. CR 2 (gallery tweak) and the "Reset to defaults" master button were deliberately **not applied**.
- Tester: **PASS** (final): main 499 passed / 0 failed / 7 skipped; panel suite 66/0/2 at M7 (now 74/0/2); variants disabled/override/invalid 8 passed + 2 skipped each, dev Strict Mode 10 passed; defaults suite 18 passed; lint 0 warnings, `tsc` and `npm run build` pass.
- Fixed (post-M7): keyboard focus no longer drops to `BODY` after All ON / All OFF / Only fix errors / Refresh. `components/ui/Button.tsx` gained `aria-disabled:` styles; `components/demo-controls/ControlPanel.tsx` uses `aria-disabled` and ignores clicks while busy/unusable (Refresh stays active with no store). The 8 `test.fail()` markers in `tests-panel/panel.spec.ts` were removed. No open items remain.
- Known, not fixed:
  - Mobile PDP Add to cart sits low (about y 996 at 390 px) even with `buriedCta` OFF. Optional change `aspect-square lg:aspect-[4/5]` in `components/product/ProductGallery.tsx` would save about 90 px (not applied).
  - Unset friction env defaults mean a bare deployment shows 8 flags ON (baseline). The clean state needs `?friction=all:off` or the panel's All friction OFF.
- Blocked: nothing.

### M6 Live toggles and control panel

- Done (details in `docs/FRICTION_FLAGS.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`):
  - Store layer `lib/flags/store/{types,index,memory,upstash}.ts`, `pin.ts`, `payload.ts`, `server.ts`; routes `app/api/flags/route.ts` (public, CDN-cached) and `app/api/demo-controls/flags/route.ts` (PIN header `x-demo-pin`); `app/robots.ts`.
  - Panel `/demo-controls` (`components/demo-controls/*`): PIN unlock, nine switches, All ON / All OFF / Only fix errors, history, Refresh, Lock, phase hints.
  - `FlagsProvider` now fetches the global layer; resolution is override > global > env > defaults.
  - Tests: `npm run test:m6` (`playwright.m6.config.ts`, `tests-panel/`), `tests/flags-unit-m6.spec.ts`, `tests/flags-store.spec.ts`.
- Designer: **APPROVED**, no must-fix. Tester: **PASS**, main suite 499 passed / 0 failed / 7 skipped; panel suite 66 passed / 0 failed / 2 skipped.
- Not verifiable locally (manual after deploy, checklist in `docs/DEPLOYMENT.md`): real Upstash behaviour and latency, Vercel CDN `s-maxage` propagation (a flip should reach a new visitor within about 60 s), runtime refusal of the memory store on Vercel.
- Known: no locking on read-modify-write (lost update possible in principle); a PIN with a trailing space still unlocks (header trimming); `page_view` may arrive up to about 1.5 s after load (`ready` waits for the flag fetch).
- Blocked: nothing.

### M5 Tracking incl. Google Analytics

- Done (details in `docs/TRACKING.md`, `docs/ARCHITECTURE.md` "Tracking flow", `docs/FEATURES.md`):
  - `lib/tracking/{uxa,ga,track,pageType}.ts`; `components/tracking/{ContentsquareTag,GoogleAnalyticsTag,PageTypeSync}.tsx` in `app/layout.tsx`, `RouteTracker.tsx` in the shop layout.
  - Contentsquare tag (`506730812ef03`), virtual page views on route changes, ten `friction_*` dynamic variables per page view, `order_value` once.
  - GA4 `G-4PLJ26X0Y9` via `next/script` (`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GA_ENABLED`), no manual `page_view`, five ecommerce events forwarded. Neither tag on `/demo-controls`.
  - dataLayer events `page_view`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`; `data-page-type` on every route; no PII.
  - Tests: `tests/tracking.spec.ts`, `tests/tracking-helpers.ts`, `npm run test:variants` (`playwright.variants.config.ts`, `tests-variants/`).
- Designer: **APPROVED**, no change requests. Tester: **PASS**, 447 passed / 0 failed / 7 skipped.
- Open GA owner questions (Enhanced Measurement, ecommerce forwarding, cookies/internal traffic) were resolved with planner defaults (`docs/DECISIONS.md`).
- Not verified: GA4 Realtime/DebugView and the real Contentsquare UI (tests use stubs). Manual checks after deploy: `docs/DEPLOYMENT.md`.
- Known: 404 page has both tags and `data-page-type=not-found` but no `page_view`.
- Blocked: nothing.

### M4 Friction flags (local)

- Done (details in `docs/FRICTION_FLAGS.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`):
  - Flag layer `lib/flags/{env,overrides,resolve}.ts` + `FlagsProvider` (`useFlag`, `useFlags`, `resolveFlags`, `deriveProfile`); `?friction=flag:on,flag:off|all:on|all:off|reset` overrides persisted in sessionStorage `tw-friction-overrides`. Resolution: override > global (empty stub until M6) > `NEXT_PUBLIC_FRICTION_*` env > code defaults (8 ON = profile `baseline`, `expressShippingError` OFF).
  - All nine behaviours: promoField, shippingSurprise, decoyBanner (`DecoyBanner.tsx`), buriedCta (`ProductStory.tsx`), deadSwatch, silentSize, slowHero (`HeroImage.tsx` + `app/api/hero-image/route.ts`, ~3.0 s, ~1.73 MB), postcodeValidation, expressShippingError (`lib/checkout/expressRate.ts`).
  - Folded in M2 CR 5-6 and M3 CR 8-9 (all landed).
  - `playwright.config.ts` sets all nine `NEXT_PUBLIC_FRICTION_*` to `off` for the e2e server.
- Designer: **APPROVED**, no must-fix.
- Tester: **PASS**, 307 passed / 0 failed / 7 skipped. 26 new tests in `tests/friction-matrix.spec.ts` (4 node-level unit tests) plus `tests/friction.spec.ts`.
  - Only unit-tested, not build-tested: the shipped default path with env unset; env ON beaten by an override OFF in a real build; global layer over env (re-test in M6).
  - Observation: on mobile the standard PDP puts Add to cart at about y=996, below the first screen even with `buriedCta` OFF. Not a flag problem; Designer may look in M7.
- Open nice-to-haves for the M7 backlog: Designer CR 1 `HeroImage` renders null until flags are ready (empty frame, no layout shift; fix: show static `/images/hero.svg` with priority while not ready and swap only if `slowHero` resolves ON, or fade in; `/api/hero-image` must not be requested when OFF); CR 2 optional `select-none` on `DecoyBanner`.
- Blocked: nothing.

### M2 Catalogue and cart store

- Done: homepage, PLP sort, full PDP, cart store, header count, mini-cart drawer, `lib/pricing.ts`. Details in `docs/FEATURES.md`.
- Designer re-review: **APPROVED** (CR 1-4 done: desktop thumbnail rail, shorter mobile tiles, distinct tile art, 2-column newsletter).
- Deferred to M4, now done: CR 5 (size-chip error border, `SizeSelector.tsx`), CR 6 (sticky PDP gallery column, `PurchasePanel.tsx`).

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
- Deferred to M4, now done:
  - CR 8: below 360 px the stacked input collapses to about 20 px. Fix: `flex-1` -> `xs:flex-1` in `NewsletterSignup.tsx` and `PromoCode.tsx`.
  - CR 9: "Remove code" wraps at 390 px. Fix: `className="shrink-0 whitespace-nowrap"` on that Button in `PromoCode.tsx`.
- Blocked: nothing.

## Next steps

1. Owner: work through "Manual steps for the owner" above (commit, deploy, allow-list, post-deploy checks, PIN hygiene).
2. Optional follow-ups (not required for the demo):
   - Mobile PDP: Add to cart sits at about y 996; gallery change `aspect-square lg:aspect-[4/5]` in `components/product/ProductGallery.tsx` would save about 90 px.
   - Optional: `scripts/traffic/` persona script (not built; `docs/TRAFFIC_GUIDE.md`), `select-none` on `DecoyBanner`, "Reset to defaults" button (not applied by design decision), ON/OFF word size in `FlagRow`.

## Change log

- 2026-10-15: Panel focus-drop fixed (`aria-disabled` on All ON / All OFF / Only fix errors / Refresh; `Button.tsx` `aria-disabled:` styles; 8 `test.fail()` markers removed). Tester PASS: test:m6 74 passed / 0 failed / 2 skipped (was 66), test:e2e 499/0/7, test:defaults 18, test:variants 8 per variant and 10 in dev, lint 0 warnings, tsc and build pass. Double activation sends exactly 1 POST and 1 history entry. Trade-off: aria-disabled buttons stay focusable and are announced as unavailable.
- 2026-10-15: M7 done. Final docs written (DEMO_SCRIPT, TRAFFIC_GUIDE, DEPLOYMENT, README, CLAUDE.md). Designer APPROVED (CR 1 hero slow-visibility fixed; CR 2 and Reset to defaults not applied). Final Tester PASS: main 499/0/7, panel 66/0/2, variants 8+2 skipped each (dev 10), defaults 18; lint 0 warnings, tsc and build pass. Open low item: focus drop on panel master buttons. Prod still runs the M3 build; manual steps listed above.
- 2026-10-14: M6 done. Built flag store (Upstash/memory/none), PIN auth, `/api/flags`, `/api/demo-controls/flags`, `/demo-controls` panel, `robots.ts`, `FlagsProvider` global fetch; global layer now live in resolution. Designer APPROVED (no must-fix), Tester PASS: main 499/0/7, panel suite (`npm run test:m6`) 66/0/2. Real Upstash and CDN propagation unverified until deploy. Docs updated (FRICTION_FLAGS, DEPLOYMENT, ARCHITECTURE, FEATURES, DECISIONS, STATUS, README, CLAUDE). Prod still runs the M3 build.
- 2026-10-14: M5 done. Built Contentsquare tag, virtual page views, `friction_*` dynamic variables, `order_value`, GA4 (`next/script`, ecommerce forwarding, no manual `page_view`), dataLayer events, `data-page-type`, and `npm run test:variants`. Designer APPROVED (no change requests), Tester PASS 447/0/7 (stubs only; GA4 Realtime/DebugView and Contentsquare UI unverified). Dev-only Strict Mode double `view_item` found by Tester, fixed by Builder (guard in `PurchasePanel`). GA owner questions resolved with planner defaults. Docs updated (TRACKING, FEATURES, ARCHITECTURE, DECISIONS, DEPLOYMENT, STATUS). Prod still runs the M3 build.
- 2026-10-14: M4 done. Built `lib/flags/*`, `FlagsProvider`, `?friction=` overrides, all nine friction behaviours, `/api/hero-image`, `expressRate.ts`, `HeroImage`, `DecoyBanner`, `ProductStory`; folded in M2 CR 5-6 and M3 CR 8-9. Designer APPROVED (no must-fix), Tester PASS 307/0/7. Google Analytics added to PLAN and DECISIONS under M5 (three owner questions open). Docs updated (FRICTION_FLAGS, FEATURES, ARCHITECTURE, DECISIONS, STATUS). Nothing committed since `64797dc`.
- 2026-10-14: Vercel set up. Project `tidewild-demo` linked to GitHub, prod at https://tidewild-demo.vercel.app, SSO protection disabled via CLI, env vars (`DEMO_CONTROLS_PIN`, `NEXT_PUBLIC_CS_TAG_ID`, `NEXT_PUBLIC_CS_ENABLED`) set, Upstash Redis (`upstash-kv-camel-park`) connected. `docs/DEPLOYMENT.md` written.
- 2026-10-14: M3 done. Built cart page, promo, shipping/totals, checkout with validation and processing state, order save, confirmation and no-order state. Tester PASS 239/0/7. Designer requested CR 1-7 (must-fix CR 1 processing colour, CR 4 field focus order); Builder fixed all; e2e re-run 239/0/7, lint/tsc/build pass; Designer re-review approved. CR 8-9 deferred to M4. M2 re-review approved (CR 5-6 deferred to M4). Git initialised (initial commit `a3850bc`). Docs updated (STATUS, FEATURES, ARCHITECTURE, DECISIONS).
- 2026-10-14: M2 built (home, PLP sort, PDP, cart store, header count, mini-cart drawer, `lib/pricing.ts`). Tester PASS 177/0. Designer requested CR 1-4 (1 must-fix: desktop thumbnail rail); Builder implemented them; re-review in progress. M3 build started. Docs updated (FEATURES, ARCHITECTURE, DECISIONS, STATUS).
- 2026-10-14: M1 done. Designer re-review approved all 12 items; Tester re-run 124 passed / 0 failed (skip-link fix confirmed).
- 2026-10-14: M1 built (scaffold, tokens, shell, catalogue, SVG imagery, placeholders, Playwright). Designer review: changes requested (4 must-fix), Builder fixed them. Tester: 123 passed, 1 failed (skip link, since fixed). Docs created.
- 2026-10-14: Plan finalized with owner answers (`docs/DECISIONS.md`). Design tokens written.
