# Test report

## Master button focus fix - 2026-10-15

- Verdict: **PASS**. The low-severity defect (focus dropped to BODY after All ON / All OFF / Only fix errors / Refresh) is fixed; no regressions.
- Static: `npm run lint` (clean), `npx tsc --noEmit`, `npm run build`: PASS.
- Suites (run one at a time): `test:m6` 74 passed, 0 failed, 2 skipped (desktop-only); the 8 former `test.fail()` button-focus tests now pass as normal tests. `test:e2e` 499 passed, 0 failed, 7 skipped. `test:defaults` 18 passed. `test:variants` 8 passed + 2 skipped (x3 variants) and 10 passed (dev), 0 failed.
- Independent checks (real build, memory store, PIN 246810; desktop and mobile, 8 of 8 passed): focus stays on each of the four buttons after Enter and Space, and `aria-disabled` is cleared afterwards. Rapid triple activation (Enter, Enter, Space) plus a forced click while the POST was delayed 900 ms produced exactly 1 POST and exactly 1 new history entry; other master buttons were inert during the busy window (1 POST total). Lock returns to the gate, wrong PIN shows the error, correct PIN unlocks, Lock stays keyboard-activatable.
- `FLAG_STORE=none` (port 3101): warning "Global store not configured: toggles disabled" shown; All ON / All OFF / Only fix errors have `aria-disabled="true"` and no `disabled` attribute, clicks and Enter send no POST and focus stays. Refresh stays active by design (it only re-reads, 1 GET).
- Visual: screenshots of PDP, cart and checkout at 1280 and 390 (`test-results/screenshots/m7btn-*.png`) show Add to cart / Proceed to checkout in the normal accent style; the new `aria-disabled:` classes only apply when the attribute is set. Not visually checked: mobile PDP Add to cart (below the fold in the screenshot).
- Screen-reader semantics: `aria-disabled` buttons stay focusable and are announced as dimmed/unavailable, by design (the trade-off for keeping focus). `disabled` is no longer used on these four buttons.
- Scratch verification spec and config were deleted; all servers stopped.

---
## Final M7 regression - 2026-10-15

- Verdict: **PASS**. No blocking failures. One low-severity, non-blocking finding (focus on buttons, below).
- Static: `npm run lint` (0 errors, 0 warnings), `npx tsc --noEmit`, `npm run build`: all PASS.
- All servers started by the tests were stopped (checked with `lsof`: nothing on 3000-3400). All servers set `FLAG_STORE` explicitly (memory or none), blank or fake `KV_`/`UPSTASH_`; `.env.local` (real Upstash) was never printed, used for the store or written to. `.env.local` has only KV_/REDIS_/OIDC keys, no `NEXT_PUBLIC_FRICTION_*`.

| Suite | Command | Result |
|---|---|---|
| Main (desktop + mobile) | `npm run test:e2e` | 499 passed, 0 failed, 7 skipped (project-specific) |
| Panel / fallback (serial, 5 servers) | `npm run test:m6` | 66 passed, 0 failed, 2 skipped (desktop-only tests); plus 8 new expected-failure tests (below) |
| Variants disabled / override / invalid | `npm run test:variants` | 8 passed + 2 skipped each, 0 failed |
| Variant dev (`next dev`, Strict Mode) | same | 10 passed, 0 failed (the M5 double `view_item` is fixed) |
| Shipped defaults (NEW, env unset, port 3300) | `npm run test:defaults` | 18 passed (9 x 2 projects), 0 failed |

| Area | Result | Notes |
|---|---|---|
| Shell (header, mobile menu, footer, skip link, landmarks, 404, touch targets, overflow) | PASS both | `tests/shell.spec.ts`, `smoke.spec.ts` |
| Catalogue (home, PLP counts, sort + invalid sort, PDP gallery, swatches, sizes, qty) | PASS both | `catalogue.spec.ts` |
| Cart (qty, remove, promo valid/invalid, shipping threshold, empty, persistence) | PASS both | `checkout.spec.ts` |
| Checkout (validation, banner, express, processing, no card persistence) | PASS both | |
| Confirmation (order number, once-only purchase, no-order state) | PASS both | |
| Friction flags (each ON works, OFF fully gone, override > global > env > default) | PASS both | `friction*.spec.ts` |
| Shipped defaults (env unset): 8 ON, `expressShippingError` OFF, profile `baseline` | PASS both | Real build + start on 3300. Verified: `/api/flags` global layer empty, dataLayer `page_view` friction map and `friction_profile=baseline`, hero from `/api/hero-image`, decoy banner is a non-interactive DIV, buried CTA on backpack only, dead moss swatch, silent size on jacket (no error, drawer, event or cart write; other sized product still shows the error), cart promo expanded and "Calculated at checkout", postcode `1234 AB` rejected and `1234AB` accepted, Express with postcode 1012 throws no TypeError, panel shows `baseline`, promoField ON, expressShippingError OFF, source default. Matches docs/FRICTION_FLAGS.md |
| Tracking incl. GA | PASS both | CS once per route, not on `/demo-controls`; virtual page views; `friction_*` variables; `order_value` once; GA `js`+`config` order, 5 ecommerce events once; no PII; disabled/override/invalid/dev variants pass |
| Control panel and live toggles | PASS both | Wrong PIN rejected by panel and API; all 9 toggles and 3 master buttons; new visitor sees `expressShippingError` ON error and OFF removes it (memory store). Switch keyboard focus: the former `test.fail()` test "focus stays on the switch after toggling it with the keyboard" is now a normal test and PASSES on both projects (`tests-panel/panel.spec.ts:520`); no `test.fail()` marker remains on it |
| Fallbacks | PASS both | `FLAG_STORE=none`, empty PIN, `VERCEL=1` memory refusal, failing Upstash URL: shop works, no console errors, panel controls disabled with message |
| A11y spot checks | PASS both | Skip link, landmarks, labelled fields, `aria-invalid`/`aria-describedby`, switch roles and names, `aria-live` promo and size messages, focus return from drawer, targets >= 44 px |
| Console errors | PASS both | Zero console/page errors on sweeps with `all:off`, defaults, and `all:on,expressShippingError:off`; errors appear only with Express ON and only as `pageerror` |
| Screenshots | PASS | Re-captured both viewports; read mobile and desktop home and mobile demo-controls gate: clean, no overflow |

### Failures

None blocking.

### Findings

1. **Low: keyboard focus drops to BODY after activating the master buttons and Refresh.** Confirmed: only `components/demo-controls/Switch.tsx` was changed to `aria-disabled`. `All ON`, `All OFF`, `Only fix errors` (`disabled={disabled}`, `ControlPanel.tsx` lines about 251-275) and `Refresh` (`disabled={busy}`, line about 224) still use the real `disabled` attribute while a request is in flight, so Chromium drops focus. Repro: unlock `/demo-controls`, Tab to a master button, press Enter; `document.activeElement` is `BODY`. Added 8 expected-failure tests (4 buttons x 2 projects, `test.fail()`) in `tests-panel/panel.spec.ts` ("keyboard focus on buttons"); they count as passed now and will report "unexpectedly passed" once fixed (then delete the `test.fail()` line). Fix idea: `aria-disabled` plus ignore clicks while busy, in `components/ui/Button.tsx` or per button.
2. Confirmed M7 changes show no regressions: Switch aria-disabled, HeroImage key remount (slowHero ON/OFF, layout and request checks pass), DecoyBanner `select-none`, FlagRow text.
3. Lint warning about unused `seedCartInit` in `tests-variants/variants.spec.ts` is gone (lint is clean).

### Added by the Tester in M7

`playwright.defaults.config.ts`, `tests-defaults/defaults.spec.ts`, npm script `test:defaults` (package.json), and the button-focus tests above. No application code changed.

### Manual post-deploy steps (not verifiable locally)

- Real Upstash: persistence across serverless instances and cold starts, REST latency and the 1.5 s timeout, key `tw:friction`, KV vs UPSTASH env naming. A new visitor must see an `expressShippingError` flip within about 60 s (CDN `s-maxage=10`, SWR 20) and OFF must fully remove the error; `/api/demo-controls/flags` must not be cached.
- Vercel runtime refusal of the memory store (tested only with `VERCEL=1` locally).
- Production still runs the M3 build until deployed; after deploy, repeat the smoke check (`/`, `/demo-controls`, `/product/field-tote`, `/cart`) and confirm the deployed default is profile `baseline`.
- GA4 Realtime/DebugView: hard loads and SPA navigations counted once, purchase once, `_ga` cookies (no consent banner).
- Contentsquare: allow-list `tidewild-demo.vercel.app`; the real tag consumes `_uxa` page views and shows `friction_*` and `order_value`.
- CDN delivery and weight of `/api/hero-image` (about 3 s, 1.7 MB) on Vercel.

---

## M6 Live toggles and control panel - 2026-10-14

- Verdict: **PASS** (one low-severity keyboard-focus defect, non-blocking, tracked by a `test.fail()` test).
- `npm run lint` (0 errors, 1 pre-existing warning in `tests-variants/variants.spec.ts`), `npx tsc --noEmit`, `npm run build`: PASS.
- Main suite `npm run test:e2e` (production build, `FLAG_STORE=memory`, both projects): **499 passed, 0 failed, 7 skipped** (was 447; +30 = 15 new node-level unit tests x 2 projects in `tests/flags-unit-m6.spec.ts`, +22 from the Builder's `tests/flags-store.spec.ts`).
- New serial suite `npm run test:m6` (`playwright.m6.config.ts`, `tests-panel/`): **66 passed, 0 failed, 2 skipped** (the pristine-store test and the 30 s refetch test are desktop-only). Includes 2 `test.fail()` known-defect checks (counted as passed).
- Why a separate suite: panel tests mutate the process-wide memory store, which would race with the parallel main suite. One build, five `next start` servers, one worker. All servers set `FLAG_STORE` explicitly and override every `KV_`/`UPSTASH_` var, so `.env.local` (real Upstash) is never used and the real store is never written. All servers were stopped afterwards.
  - 3000 memory + PIN 246810 (the Upstash vars are set to fake values to prove memory wins) | 3101 `FLAG_STORE=none` | 3102 memory + empty PIN | 3103 memory + `VERCEL=1` | 3104 `FLAG_STORE=upstash` with a fake unreachable URL (GET and 502 path only).

| Area | Check | Desktop | Mobile |
|---|---|---|---|
| Auth API | GET and POST: missing, empty, wrong, near-miss (prefix/suffix), wrong header name, Bearer, cookie, query-string PIN all 401 `no-store`; auth before body validation; header name case-insensitive; rejected POST changes nothing; wrong PIN delayed >= ~500 ms | PASS | PASS |
| Auth API | PIN not configured (empty `DEMO_CONTROLS_PIN`): GET/POST 503 `pin_not_configured` with any header, nothing written | PASS | PASS |
| Bodies | Malformed JSON, empty, null, array, number, string, `{}`, unknown action, missing/invalid flag, non-boolean value, `__proto__`, wrong-case action: all 400 `invalid_body`, state unchanged; PUT/PATCH/DELETE 405 | PASS | PASS |
| Panel UI | Masked labelled PIN, wrong PIN -> "Wrong PIN", empty submit no-op, unlock, reload stays unlocked, Lock clears sessionStorage, stale stored PIN returns to the gate, other context not unlocked | PASS | PASS |
| Panel UI | PIN not configured: `pin-disabled` text, no input/controls, stored PIN cannot unlock | PASS | PASS |
| Toggles | All 9 switches: flip, state text, source "set here", `flag-updated-*` not "never" with ISO title, history line "A: OFF to ON", `/api/flags` reflects it, flip back restores | PASS | PASS |
| Master | All ON / Only fix errors (7 ON, postcode + express OFF) / All OFF update every switch, history, public API; unchanged flags keep their `updatedAt`; no-op master records one "No effective change" entry; profile text follows (express_error / fixed / baseline / clean) | PASS | PASS |
| History | Store capped at 30, panel shows 20, newest first; second panel sees change only after Refresh | PASS | PASS |
| Live | New browser context: OFF baseline clean; panel flip ON -> TypeError for a new visitor, Pay blocked; flip OFF -> new visitor completes an Express order to `/confirmation` with zero console errors | PASS | PASS |
| Live | Visitor with the site already open picks up the change on a client-side navigation after the 30 s refetch window (decoyBanner, about 32 s) | PASS | skipped |
| Order | Real build: env beats code default (all 9 show source "build env" on the untouched store); global beats env (strict postcode); override beats global both directions (`?friction=expressShippingError:off` vs global ON, `:on` vs global OFF, `all:off`) | PASS | PASS (pristine check desktop only) |
| Headers | `/api/flags` `public, max-age=0, s-maxage=10, stale-while-revalidate=20`, keys only configured/store/flags/updatedAt (no history, PIN, token); panel API `no-store` on 200/400/401/503; error variant `s-maxage=5` | PASS | PASS |
| Fallback | `FLAG_STORE=none`: `/api/flags` 200 `configured:false`; panel API GET 200, POST 503 `store_not_configured`, bad body 400; panel warning text, all switches and master buttons disabled; shop sweep (home, PLPs, PDP, cart, checkout with Express) zero console/page errors; `?friction=` still works | PASS | PASS |
| Fallback | `FLAG_STORE=memory` with `VERCEL=1` at runtime: refused (unconfigured, POST 503, warning) | PASS | PASS |
| Fallback | Configured but failing store (fake URL): `/api/flags` 200 `error:true`, short cache; shop works with no console errors; panel GET 200 `error:true`, POST 502 `store_error`, "not reachable" warning, controls disabled | PASS | PASS |
| Hygiene | robots.txt disallows `/demo-controls` and `/api/`; page noindex,nofollow; no header/footer/nav; no CS/GA request or script, no `_uxa`/`dataLayer`/`gtag`; `data-page-type="demo-controls"` only; no shop page links to it | PASS | PASS |
| Layout | Panel gate, wrong PIN, panel, unconfigured, PIN-disabled, store-error screenshots reviewed (desktop and mobile): no overflow, switches >= 44 px, readable, history legible | PASS | PASS |
| Unit | `checkPin` (exact only, empty/unset disabled, unicode, 100k chars, uses `timingSafeEqual` on hashed equal-length digests, coarse timing ratio), `getStore` (memory beats Upstash vars of either naming, VERCEL refuses memory, case/trim, `upstash` needs credentials, half pair, bogus mode), `applyAction` (cap 30, updatedAt semantics, master actions, profiles, no mutation), `parseAction`, `sanitizePayload` | PASS | PASS |
| Regression | M1-M5 specs, friction, tracking | PASS | PASS |

### Failures

None blocking.

### Findings (non-blocking)

1. **Keyboard focus is lost after toggling a switch (low).** Repro: unlock `/demo-controls`, Tab to a switch, press Space. Expected: focus stays on the switch. Actual: `document.activeElement` is `BODY` (the switch is `disabled` while the request is in flight, so Chromium drops focus); a keyboard or screen-reader user must tab from the top after every toggle. Suspected: `components/demo-controls/ControlPanel.tsx` (`disabled = !usable || busy` passed to `Switch`/`FlagRow`). Fix idea: use `aria-disabled` and ignore clicks while busy, or restore focus after the request. Test `tests-panel/panel.spec.ts` "focus stays on the switch" uses `test.fail()`; when fixed it will report "unexpectedly passed", then delete the `test.fail()` line.
2. **Flake found and fixed in a test (not an app bug).** `tests/friction-matrix.spec.ts` silentSize test sometimes saw dataLayer length 5 instead of 4 (1 of 4 runs). Cause: `page_view`/`view_item` are gated on the flag provider being ready (`/api/flags` settled, up to 1.5 s), so under 5 parallel workers a late `page_view` landed after the baseline snapshot. I added a wait for both events before the baseline (stricter, not weaker). Product note: page views can be pushed up to about 1.5 s after load on a slow `/api/flags`.
3. Observations: a PIN with trailing/leading whitespace sent from the panel is trimmed by HTTP header handling, so `"246810 "` unlocks (harmless). Parallel writes are read-modify-write without locking (memory store); 8 parallel toggles of different flags all applied locally, but a lost update is possible in principle (also on Upstash). Only relevant if two people press buttons within the same few ms.

### Not verified (only possible manually after deploy)

- Real Upstash behaviour: persistence across serverless instances/cold starts, REST latency and the 1.5 s timeout, key `tw:friction` read/write, KV vs UPSTASH env naming on Vercel (`.env.local` real credentials were deliberately not used).
- Vercel CDN: `s-maxage=10` / `stale-while-revalidate=20` propagation (a flip reaching a new visitor within 60 s through the edge cache), and that the CDN does not cache `/api/demo-controls/flags`. Locally only the headers were asserted.
- The refusal of `FLAG_STORE=memory` on Vercel was tested with `VERCEL=1` on a local server, not on Vercel itself.
- Prod still runs the M3 build until deployed.

---

## M5 Tracking (incl. Google Analytics) - 2026-10-14

- Verdict: **PASS with one low-severity dev-only finding** (not seen in the production build).
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: PASS.
- Main suite (`npm run test:e2e`, production build, both projects): **447 passed, 0 failed, 7 skipped** (was 307; +140 = 70 new tests x 2 projects in `tests/tracking.spec.ts`, helpers in `tests/tracking-helpers.ts`). `tests/fixtures.ts` unchanged (already stubs CS and Google hosts).
- Build-time variants (`playwright.variants.config.ts`, `tests-variants/variants.spec.ts`, `npm run test:variants`; each variant does its own build/start on port 3000, stopped afterwards):

| Variant | Env | Result |
|---|---|---|
| disabled | `NEXT_PUBLIC_GA_ENABLED=false`, `NEXT_PUBLIC_CS_ENABLED=false` | PASS 8/8 (no GA/CS request or script, no `window.gtag`/`__gaInit`/`_uxa`, no js/config; shop, plain events, page types, purchase-once still work) |
| override | `NEXT_PUBLIC_GA_ID=G-TESTOVER12`, `NEXT_PUBLIC_CS_TAG_ID=abc123def456` | PASS 8/8 (script URL and `config` arg change; CS URL changes) |
| invalid | `NEXT_PUBLIC_GA_ID="not a valid id"`, `NEXT_PUBLIC_CS_TAG_ID="bad id/../x"` | PASS (GA and CS both off, as designed) |
| dev (`next dev`, React Strict Mode) | defaults | 1 FAIL, see failure 1; the rest of the Strict Mode checks pass |

| Area | Check | Desktop | Mobile |
|---|---|---|---|
| CS | Script requested once (exact URL) on every shop route incl. 404, once across client navigation, one script tag | PASS | PASS |
| CS | Not requested on `/demo-controls`; no `_uxa`, no `__csLoaded`, no script tags | PASS | PASS |
| CS | No manual `trackPageview` on first load; route changes push pathname+search (incl. `?sort=`); not before the tag loaded (delayed-script test); same location not repeated; trackPageview precedes the 10 variables | PASS | PASS |
| CS | 10 dynamic variables per page view; values for build default (clean), `all:on` (express_error), baseline, fixed, single flag, express only; same state in dataLayer `page_view`; persists on next page view | PASS | PASS |
| CS | `order_value` once, number equal to the confirmation total, only on `/confirmation` | PASS | PASS |
| dataLayer | `page_view` shape and values, per route change page_type/page_path | PASS | PASS |
| dataLayer | `view_item`, `add_to_cart` (variant `colour / M`, qty, value; none when size missing or silentSize blocks), `remove_from_cart` (only Remove, not steppers), `begin_checkout` (before `page_view`, once, coupon, none for empty cart), `purchase` (exact payload, no coupon key without promo) | PASS | PASS |
| dataLayer | purchase once: SPA history back, reload x2, direct revisit; two orders = two distinct purchases; no purchase without an order | PASS | PASS |
| dataLayer | No email, name, address or card data in dataLayer, `_uxa` or gtag entries | PASS | PASS |
| page type | `data-page-type` on all routes incl. `not-found` for unknown route, product and category; updates on client navigation | PASS | PASS |
| 404 | Both tags, `data-page-type=not-found`, no `page_view` | PASS | PASS |
| Selectors | Section 8 ids present for header/footer/mobile nav, home, PLP, PDP, mini-cart, cart, checkout, confirmation, processing | PASS | PASS |
| GA | `#ga-src` once and gtag/js requested once on `/`, PLPs, PDP, cart, checkout, confirmation, two 404s | PASS | PASS |
| GA | `/demo-controls`: no request, script, `gtag`, `__gaInit`, or dataLayer | PASS | PASS |
| GA | `js` then `config` first (entries 0 and 1, `Arguments` objects), once, after several navigations; also before view_item on a direct PDP load | PASS | PASS |
| GA | `window.dataLayer` never reassigned (setter trap, identity kept) | PASS | PASS |
| GA | No gtag `page_view`; only the 5 ecommerce names forwarded, each once, payload equals the plain push; remove_from_cart forwarded once; two adds = two events | PASS | PASS |
| GA | No console or page errors/warnings; every Google-host request is stubbed (only gtag/js seen, none failed) | PASS | PASS |
| Regression | M1-M4 suites | PASS | PASS |

Screenshots: reviewed mobile home and desktop 404, no visual regressions.

### Failures

1. **`view_item` fires twice under React Strict Mode (dev only).** Repro: `VARIANT=dev npx playwright test -c playwright.variants.config.ts`, or `npm run dev`, open any `/product/<slug>`, inspect `window.dataLayer`. Expected: one `view_item` (plain and gtag). Actual: 2 plain and 2 gtag `view_item` entries. Not reproducible in the production build (`view_item once on PDP mount` passes, 140/140), so no impact on the deployed demo; only dev-mode data is doubled. Suspected: `components/product/PurchasePanel.tsx` (`useEffect(() => trackViewItem(product), [product])`, no once-per-product guard). Everything else under Strict Mode (page_view, begin_checkout, purchase, order_value, js/config) fires once.

### Not verified (manual after deploy)

- GA4 Realtime/DebugView: hard loads and SPA navigations each counted once (Enhanced Measurement history events, Q-GA2), purchase appears once. Real `gtag.js` is never run in tests (stubbed), so GA's own `page_view` and cookies were not exercised.
- Contentsquare allow-listing and that the real tag consumes `_uxa` (`trackPageview`, dynamic variables) and shows `friction_*` / `order_value` in the UI.
- Shipped default path (env unset) is covered only by the dev variant for tags; flag defaults still unit-level (M4 caveat).

---

## Previous milestone: M4 Friction flags (local) - 2026-10-14

- Verdict: **PASS**. Full suite (both projects): **307 passed, 0 failed, 7 skipped** (skips are project-specific tests). `npm run lint`, `npx tsc --noEmit`, `npm run build` (run by the webServer): all PASS.
- New: `tests/friction-matrix.spec.ts` (Tester, 26 tests x 2 projects, 4 of them node-level unit tests). Builder's `tests/friction.spec.ts` (8 tests) kept unchanged. Two of my first-draft assertions were wrong about the app (promo collapsed state keeps the input in a closed disclosure; standard mobile PDP CTA sits at about y=996, below the first screen). I fixed the tests, not the app.

| Area | Check | Desktop | Mobile |
|---|---|---|---|
| Unit | `resolveFlags`: override > global > env > code defaults per flag; explicit `false` beats `true` below; unmentioned flags fall through; no mutation of `FRICTION` | PASS | PASS |
| Unit | Code defaults: all ON except `expressShippingError`; `deriveProfile` (baseline / express_error / fixed / clean) | PASS | PASS |
| Unit | `applyOverrideParam`: `flag:on/off/1/true`, case and `-`/`_` aliases, `all:on/off`, `reset` (+ ops after reset), merge with stored, junk ignored | PASS | PASS |
| Overrides | `all:on` (all 9 incl. `expressShippingError`) and `all:off` write the full object to `tw-friction-overrides` and take effect | PASS | PASS |
| Overrides | Single flags merge with stored; `reset` removes the key; URL not rewritten | PASS | PASS |
| Overrides | Persist across client-side navigation (window marker survives) and reload; new browser context starts clean; unknown key / bad value ignored and nothing stored | PASS | PASS |
| Overrides | Override beats env (env OFF in test build) in both directions | PASS | PASS |
| `decoyBanner` | On bags/apparel/accessories/all: DIV, no tabindex, no link/button inside, click does not navigate; OFF absent | PASS | PASS |
| `slowHero` | OFF: no `/api/hero-image` request, `/images/hero.svg`; ON: image arrives after >2.5 s; endpoint is `image/svg+xml` > 1 MB; hero box height unchanged on arrival (no layout shift) | PASS | PASS |
| `buriedCta` | ON: CTA below story (mobile: > 2 viewports down); other product unaffected; OFF: CTA above where it is when ON; add to cart works when scrolled to | PASS | PASS |
| `deadSwatch` | ON: moss on field-tote ignores click and Enter (no state or gallery change); other swatch and other product work; OFF works; no console errors | PASS | PASS |
| `silentSize` | ON: storm-shell-jacket does nothing (no error, no drawer, no dataLayer push, no cart write); picking size then works; other sized product shows the clean error; OFF shows error | PASS | PASS |
| `promoField` | ON: input + Apply visible, no toggle; OFF: collapsed disclosure, expands; DEMO10 applies and removes in both | PASS | PASS |
| `shippingSurprise` | ON: "Calculated at checkout", total excludes shipping, no hint, checkout €6.95/€51.95; over threshold "Free"; OFF: €6.95, €51.95, hint | PASS | PASS |
| `postcodeValidation` | ON rejects `1234 AB`, `1234ab`, `12`, `AB1234`, `123456` with "Invalid input."; accepts `1234AB`, `1234`, `12345`; OFF accepts spaced / lower-case, helpful message for bad input | PASS | PASS |
| `expressShippingError` | ON: non-`10` postcode OK with Express; `/^10/` throws uncaught TypeError, page survives, Pay enabled but does nothing, Standard recovers; OFF: `1012 AB`, `1000`, `10115` all work with clean console | PASS | PASS |
| Console | Sweep of 8 routes + checkout: zero console/page errors with `all:off`; zero with `all:on,expressShippingError:off`; with `expressShippingError:on` errors appear only after selecting Express, and all are `pageerror` | PASS | PASS |
| OFF trace | After `all:on` then `all:off`: no banner, hero uses static asset, no `/api/hero-image` request | PASS | PASS |
| Regression | M1-M3 suites and Builder friction suite | PASS | PASS |

### Failures

None.

### Assessment of the Builder's `NEXT_PUBLIC_FRICTION_*=off` in `playwright.config.ts`

Sound, with caveats.
- It is needed: code defaults are ON, so without it every M2/M3 spec would see friction. Flipping per test with `?friction=` is what real users of the panel do, and the overrides are tested over the env layer.
- `NEXT_PUBLIC_*` values are inlined at build time, and the webServer command builds with these vars, so the production bundle really carries them.
- Caveat 1: the shipped code-default path (env unset, everything ON except `expressShippingError`) is not covered end to end by Playwright. It is covered only at unit level (`FRICTION` and `resolveFlags({})`). A separate build with the env unset would be needed; I did not run one.
- Caveat 2: env-layer priority in a real build is covered only for env=OFF vs override. The env=ON vs override=OFF direction is unit-level only.
- Caveat 3: the global layer is a stub (`{}`) until M6, so global > env is unit-tested only. Re-test in M6.
- Caveat 4: the first server render uses env + code defaults and overrides apply after hydration (by design). With defaults ON a visitor with `?friction=...:off` may briefly see the ON state. Not asserted here (env is OFF in the test build, so ON-to-OFF flashes are not observable). I make no claim about flashing.

### Observations (not failures)
- On mobile (390x844) the standard PDP layout puts Add to cart at about y=996, below the first screen, even with `buriedCta` OFF. Designer may want to look; not a flag problem.
- Not verified: shipped defaults in a separate build; global store (M6); Contentsquare dynamic variable `friction_*` values (M5).

---

## Previous milestone (M3 Cart, checkout, confirmation)


- Date: 2026-10-14
- Milestone: **M3 Cart, checkout, confirmation**
- Run: Playwright 1.64.0 (Chromium), projects `desktop` (1280x800) and `mobile` (iPhone 13 metrics, 390x844). Production build on port 3000 (`FLAG_STORE=memory`, `DEMO_CONTROLS_PIN=246810`); `t.contentsquare.net` stubbed.
- Result: **PASS**. 239 passed, 0 failed, 7 skipped; the skipped tests only apply to the other project.
- M1 and M2 suites re-run: all pass.

## New / changed tests

- `tests/checkout.spec.ts` (new): purchase flow, cart page, promo, shipping threshold, checkout validation, confirmation.
- `tests/screenshots.spec.ts`: adds cart filled, checkout with errors, checkout processing and confirmation with an order.
- Every test waits for the post-hydration UI before asserting. The cart and checkout render an `aria-hidden` spacer until hydration.

## Results

| Area | Check | Desktop | Mobile |
|---|---|---|---|
| Static | `npm run lint`, `npx tsc --noEmit`, `npm run build` | PASS | - |
| Flow | home -> PLP -> PDP (size M) -> add -> drawer "View cart" -> cart -> checkout -> Express -> Pay -> confirmation | PASS | PASS |
| Flow | Processing state: `checkout-processing` visible, submit disabled, then redirect to `/confirmation` | PASS | PASS |
| Confirmation | `TW-` + 6 digits, email shown, lines, "Express" method, shipping €12.95, total, Continue shopping -> `/` | PASS | PASS |
| Confirmation | Cart and promo cleared (`tw-cart-v1` empty, header count hidden) | PASS | PASS |
| Confirmation | `tw-last-order` saved with the right totals and method; reload shows the same order number | PASS | PASS |
| Confirmation | Fresh context: `confirmation-no-order` with a link to `/category/all` | PASS | PASS |
| Privacy | No card number, expiry or CVC in localStorage, sessionStorage, cookies or the console (after submit and after a failed submit + reload); card fields empty after reload | PASS | PASS |
| Cart | Line: name links to the PDP, variant, minus disabled at 1, plus disabled at 10, line total and subtotal update, header count updates | PASS | PASS |
| Cart | Persists on reload; Remove deletes the line; removing the last line shows `cart-empty` (link to shop) with no checkout button | PASS | PASS |
| Empty | Fresh `/cart` -> `cart-empty`; fresh `/checkout` -> `checkout-empty`, no form or Pay button | PASS | PASS |
| Promo | Invalid (`DEMO11`, `DEMO 10`, empty, `demo100`) -> "This code isn't valid" in `promo-code-message` (`aria-live=polite`), no discount | PASS | PASS |
| Promo | `DEMO10`, `demo10`, `  Demo10  ` apply: "DEMO10 (-10%)" row, −€15.90 on €159, total €143.10; persists on reload; carries into checkout; "Remove code" removes it | PASS | PASS |
| Shipping | €29 -> €6.95 + hint; €75 exactly -> Free; €79 -> Free | PASS | PASS |
| Shipping | Discount crossing the threshold: €79 + DEMO10 = €71.10 -> €6.95; €75 + DEMO10 = €67.50 -> €6.95; €85 + DEMO10 = €76.50 -> Free | PASS | PASS |
| Shipping | Checkout matches the cart; Express always €12.95 and the total updates live; switching back to Standard restores it | PASS | PASS |
| Banner | `checkout-demo-banner` text exactly matches the BRIEF | PASS | PASS |
| Validation | Empty submit: all 9 required errors, `aria-invalid` + `aria-describedby=error-<field>`, focus on email, no processing | PASS | PASS |
| Validation | Focus goes to the first invalid field (postcode) when earlier fields are valid | PASS | PASS |
| Validation | Errors show on blur and clear when the field is fixed | PASS | PASS |
| Validation | Email: rejects `a`, `a@b`, `a@b.c`, `a b@c.com`, `@x.com`; accepts `a@b.co` and trimmed `name.last+tag@…` | PASS | PASS |
| Validation | Postcode NL: accepts `1234 AB`, `1234AB`, lower case, padded; rejects `1234`, `12345`, `1234 A`, `AB 1234`, double space. Message "Enter a postcode like 1234 AB" | PASS | PASS |
| Validation | Postcode BE (4 digits), DE (5), FR (5) accept and reject | PASS | PASS |
| Validation | Changing country re-validates the postcode (NL `1234 AB` -> DE error; `10115` OK in DE, error in BE, OK in FR) | PASS | PASS |
| Validation | Card number: spaces stripped, 13-19 digits, no Luhn; rejects 12 digits, 20 digits, letters, dashes | PASS | PASS |
| Validation | Expiry: MM/YY format, month 01-12, current month valid, last month and last year "expired" | PASS | PASS |
| Validation | CVC: 3-4 digits only | PASS | PASS |
| Validation | Card inputs `autocomplete="off"`; email/postcode have autocomplete; all fields labelled | PASS | PASS |
| Layout | No horizontal overflow on screenshot routes | PASS | PASS |

## Failures

None.

## Notes and observations

- Postcode rules per country: BE accepts exactly 4 digits and DE/FR exactly 5 (`lib/checkout/validation.ts`). The PLAN wording says "BE/DE/FR 4-5 digits". The stricter per-country rule is more realistic and the message names a matching example, so I did not count it as a failure. Flag it if the PLAN wording is meant literally.
- Designer (not failures):
  - The disabled "Processing…" button (`checkout-processing.png`, mobile) has low-contrast text on the faded accent.
  - The checkout error state, cart, and confirmation layouts are clean on both viewports.
- Not covered yet:
  - `purchase` / `order_value` fire-once tracking (M5).
  - Friction behaviours (`promoField`, `shippingSurprise`, `postcodeValidation`, `expressShippingError`) are M4. The M4 hooks currently render the clean state.

## Screenshots (`test-results/screenshots/{desktop,mobile}/`)

`cart-filled`, `checkout-errors`, `checkout-processing`, `confirmation-order`, plus the earlier set (`cart`/`checkout` empty states, `confirmation` no-order). I reviewed:

- **Cart:** two-column layout on desktop, summary with discount and "Free" shipping, promo applied row.
- **Checkout:** red inline errors under each field, demo banner above the form, sticky summary with "Pay €258.30".
- **Confirmation:** order number, email, summary with shipping method.
- **Mobile:** stacks correctly.

## Addendum 2026-10-15: cookie consent banner and security headers

| Check | Result |
|---|---|
| `npm run lint` / `npx tsc --noEmit` / `npm run build` | PASS / PASS / PASS |
| `npm run test:e2e` (incl. `tests/consent.spec.ts`, `tests/headers.spec.ts`) | PASS: 519 passed, 0 failed, 13 skipped |
| `npm run test:m6` | PASS: 74 passed, 0 failed, 2 skipped |
| `npm run test:defaults` | PASS: 18 passed |
| `npm run test:variants` (disabled / override / invalid / dev) | PASS: 8 passed + 2 skipped x3; dev 10 passed |

Suites ran one at a time; no servers left running.

Findings:
- Consent tests are real: the fixtures in `tests/fixtures.ts` record every `t.contentsquare.net` and Google request, and the pre-consent and Decline tests assert zero tag script elements, zero requests, and no `dataLayer`/`gtag` globals. Accept asserts both tags and requests appear and consent persists across reload. `/demo-controls` has no banner and no tags.
- All five Playwright configs seed `tw-consent=accepted` through `consentState()` (m6 for all five ports); only `consent.spec.ts` overrides it with empty storage.
- Headers tests cover `/`, `/demo-controls`, `/api/flags` (six headers, CSP directives, cache-control kept) and check for CSP console violations on 5 routes with tags stubbed.
- FLAG_STORE is explicit in every config (memory, none, or upstash with a fake unreachable URL); KV_/UPSTASH_ are blanked or faked, so real Upstash is not touched. `.env.local` is gitignored and has no PIN set.
- Secrets scan: no real tokens found. The test-only PIN `246810` is committed in the configs, `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md` and specs (pre-existing). Fine only if it is not the production PIN.

Gaps (not failures):
- The CSP uses `'unsafe-inline'` and `connect-src https:`, so it is permissive. The tests check the header text, not that real tags work under the CSP, because tags are stubbed.
- A real GA4 / Contentsquare load under the CSP was not verified (stubs only).
- The banner is hidden on `/demo-controls`, so consent can only be given elsewhere.

RESULT: PASS

## Addendum 2026-10-15: `?consent=accept|decline|reset` param

Lint 0 warnings, `tsc --noEmit` clean, build OK. Suites (run one at a time): test:e2e 529 passed / 13 skipped / 0 failed; test:m6 74 passed / 2 skipped; test:defaults 18 passed; test:variants 8 passed + 2 skipped for disabled, override and invalid, 10 passed for dev.

Coverage in `tests/consent.spec.ts` ("?consent= URL param", 5 tests, desktop and mobile): accept hides banner, persists across reload, loads CS and GA only after accept, and strips `consent` while keeping `friction=all:off`; decline sets `declined` with zero tags and zero requests and strips the param; reset after accept restores the banner, clears storage, strips the param; invalid value is ignored (banner stays, nothing stored); `/demo-controls?consent=accept` stores nothing and loads no tags or requests.

Gap (minor, not a failure): the `/demo-controls` test does not assert the `consent` param is left in the URL. Code returns early on that path, so it is untouched. No servers left running; `.env.local` and Upstash untouched.

RESULT: PASS
