# Decisions

Newest first. Each entry: decision, why, date.

## 2026-10-19 - Contentsquare loads without consent (Option 1)

1. **Contentsquare tag and all `_uxa` pushes load for every visitor; only Google Analytics stays behind the cookie banner.** Supersedes decision 1 of 2026-10-15 ("banner gates GA4 and Contentsquare"). `ContentsquareTag` and `uxaPush` no longer check consent; `RouteTracker` has a consent-free Contentsquare effect and a consent-gated GA `page_view` effect (fires right after Accept). Neither tag runs on `/demo-controls`.
   Why: Contentsquare's installation check failed once the tag was gated behind the banner, and `?consent=accept` did not satisfy the verification; the tag must be detectable on a plain first visit.
   Consequences: every visit is recorded in Contentsquare, Decline only disables GA, `?consent=` now only matters for GA. Banner copy: "We use Google Analytics cookies to understand how this demo store is used. We also run Contentsquare to analyse sessions." Contentsquare privacy settings should collect without a consent step.
2. **CSP `font-src` now allows `https://*.contentsquare.net`** (survey fonts were blocked). Open risks to check in the live console: no `frame-src`, fonts on `*.contentsquare.com`, external stylesheets.
3. **Traffic generator documented** (`scripts/traffic/`, `docs/TRAFFIC_GUIDE.md` section 9). The 2026-10-16 100-session live run hit a store with all flags ON (including `expressShippingError`), so it was phase B, not baseline. Since done: session cap raised 4 to 10 minutes, baseline preflight added. To do: reset panel to baseline, rerun.

## 2026-10-15 - Cookie consent, security headers, audit

1. **(Contentsquare part superseded 2026-10-19) Cookie consent banner gates GA4 and Contentsquare (reverses the earlier "no banner" answer, Q5).** `lib/consent.ts` (localStorage `tw-consent`), `components/layout/CookieBanner.tsx`; tags and `track`/`uxa` helpers no-op without Accept; `RouteTracker` waits. No banner or tags on `/demo-controls`.
   Why: loading tracking cookies and session recording without consent is not acceptable for a public site.
   Consequences: pre-consent pages are not recorded; Decline = never tracked; no withdraw/change UI yet (accepted for now). Every Playwright config seeds `tw-consent=accepted` (`tests/consent-state.ts`) so existing suites are unchanged; `tests/consent.spec.ts` covers the banner.
2. **Security headers in `next.config.ts`:** nosniff, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, Permissions-Policy (camera, microphone, geolocation, payment off), HSTS (2 years, includeSubDomains), and an **enforced but deliberately loose CSP** (`'unsafe-inline'` scripts/styles, `connect-src 'self' https: wss:`, GA and Contentsquare hosts allowed).
   Why: a strict CSP risks silently blocking the Contentsquare tag and its collectors, which would break the demo. Real GA/Contentsquare under the CSP is still to verify on the live site (`docs/DEPLOYMENT.md`). Covered locally by `tests/headers.spec.ts`.
3. **`?consent=accept|decline|reset` URL param (2026-10-15).** `applyConsentParam()` in `lib/consent.ts`, applied once on mount in `CookieBanner`; invalid values ignored; param stripped, other params kept; no effect on `/demo-controls`.
   Why: the site is a demo for a Contentsquare hiring manager and the owner wants every session recorded as if from real customers, so demo links are `https://tidewild-demo.vercel.app/?consent=accept&friction=all:off`. This is a demo site; test orders are intentionally recorded as real data.
   Consequences: anyone with the link can skip the banner (acceptable for a demo). The banner still protects ordinary visitors. No PIN involved.
4. **Checkout expiry auto-slash:** `formatExpiry` in `CheckoutForm.tsx` inserts `/` after two typed digits (not when deleting). Purely a usability fix, not a friction flag.
5. **npm audit:** 0 production vulnerabilities; 5 high, dev-only (`braces` via `eslint-config-next`). The fix would be a breaking downgrade, so deferred.

## 2026-10-14 - M5 Tracking (built)

1. **Open GA owner questions resolved with the planner defaults:** Q-GA2 Enhanced Measurement history events assumed ON (no manual `page_view`); Q-GA3 ecommerce events forwarded to GA4; Q-GA4 GA cookies accepted without a consent banner (to be stated in the traffic guide/privacy note in M7). If the owner later says otherwise, only `RouteTracker`/`track.ts` change.
2. **Contentsquare virtual page views only on route changes and only after the tag loaded** (`window.__csLoaded`). Why: the tag records the natural first page view; pushing early would double count.
3. **Both tags are absent on `/demo-controls`** (owner-confirmed) and RouteTracker is mounted in the shop layout, so the 404 page has tags and `data-page-type=not-found` but no `page_view`. Accepted.
4. **`track()` calls `ensureGtag()` first**, so `js`/`config` always precede events in the shared `window.dataLayer`; only `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase` are forwarded to `gtag('event')`.
5. **`begin_checkout.value` = subtotal minus discount, no shipping**; `purchase.value` is the order total. `remove_from_cart` fires only on Remove, not on quantity steppers.
6. **Tag ids are validated at build** (`G-[A-Z0-9]+`, alphanumeric CS id); an invalid value turns the tag off rather than injecting it into a URL. Covered by `npm run test:variants`.
7. **Dev-only Strict Mode double `view_item` found by Tester, fixed by Builder (guard in `PurchasePanel`).** Production was unaffected.
8. **Verified with stubs only.** GA4 Realtime/DebugView and the real Contentsquare UI need manual checks after deploy (`docs/DEPLOYMENT.md`).

## 2026-10-14 - M4 Friction flags (local)

1. **Strict postcode rule: `^\d{4}[A-Z]{2}$` or `^\d{4,5}$`, message "Invalid input."** Why: it rejects the natural Dutch entries (`1234 AB`, `1234ab`) on the first attempt with an unhelpful message, which is the error-analysis story, while `1234AB` and numeric BE/DE/FR codes still pass so a user can recover. Code: `lib/checkout/validation.ts`.
2. **Friction targets are one product each:** `trailhead-28-backpack` (buriedCta), `field-tote` Moss (deadSwatch), `storm-shell-jacket` (silentSize). Why: keeps the other 21 products clean so heatmap/replay comparisons have a control. Constants in `lib/config.ts`.
3. **`expressShippingError` throws a real `TypeError`** ("Cannot read properties of undefined (reading 'rate')") from a zone lookup with no entry for postcodes starting `10`, not a thrown custom message. Why: Contentsquare error analysis then shows a realistic stack and message. Standard shipping recovers. Code: `lib/checkout/expressRate.ts`.
4. **Overrides apply after hydration; server and first client render use env + defaults.** Why: avoids hydration mismatches. `useFlags().ready` marks when overrides are applied; `HeroImage` renders only when ready so OFF never requests `/api/hero-image`. Cost: a briefly empty hero frame (M7 backlog).
5. **Global flag layer is an empty stub until M6, with no `/api/flags` fetch.** Why: the route does not exist yet and a 404 would log a console error.
6. **e2e server sets all nine `NEXT_PUBLIC_FRICTION_*` to `off`** (`playwright.config.ts`); friction tests flip flags with `?friction=`. Why: keeps the M1-M3 specs asserting clean behaviour while code defaults ship with 8 flags ON.
7. **M4 folded in the deferred nice-to-haves** M2 CR 5-6 and M3 CR 8-9; Designer confirmed all landed. Remaining nice-to-haves go to M7 (HeroImage empty frame, optional `select-none` on DecoyBanner).

## 2026-10-14 - Google Analytics (planned, M5)

1. **Add GA4 (gtag.js, measurement id `G-4PLJ26X0Y9`) on every shop page, implemented with `next/script` in a `GoogleAnalyticsTag` client component in the root layout.** Configurable via `NEXT_PUBLIC_GA_ID` (default `G-4PLJ26X0Y9`, validated `G-XXXX`) and `NEXT_PUBLIC_GA_ENABLED` (default `true`).
   Why: owner request. `@next/third-parties/google` exists for Next 16 but is not installed and would be a new runtime dependency (the plan allows only next/react/react-dom); `next/script` mirrors the supplied snippet and lets us skip the tag per pathname like the Contentsquare tag. Placed in M5 because it shares `window.dataLayer`, `track()` and the test fixture with the other tags.
2. **Not loaded on `/demo-controls`** (owner-confirmed 2026-10-14). Why: internal panel, would pollute analytics and the panel is noindex; same rule as the Contentsquare tag. GA is present on all shop routes (and the 404 page), absent on `/demo-controls` and when disabled.
3. **Shared `window.dataLayer`:** initialised once with `|| []`, never reassigned. `track()` keeps pushing plain `{ event, ... }` objects (Contentsquare/GTM style); `gtag()` pushes `arguments` objects. GA never reads the plain objects, so they cannot double count. Ecommerce events (`view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`) are additionally forwarded with `gtag('event', ...)` from the same `track()` call (pending Q-GA3), so `purchase` is sent once, under the existing `purchaseTracked` guard.
4. **No manual GA `page_view` on SPA navigation:** rely on GA4 Enhanced Measurement history-change page views (pending Q-GA2 confirmation that it is on in the property). A manual one would double count.
5. **No cookie banner (unchanged, Q5).** GA sets `_ga` cookies; TRAFFIC_GUIDE/privacy must say so. No Consent Mode.
6. **Tests never send real hits:** Playwright stubs googletagmanager.com and google-analytics.com like t.contentsquare.net.

Open owner questions:
- **Q-GA2:** is "Page changes based on browser history events" enabled under Enhanced Measurement in the GA4 property? Default: assume yes (GA4 default). Options: yes (no manual page_view) / no or unsure (builder adds `send_page_view:false` + manual `page_view` in RouteTracker).
- **Q-GA3:** forward ecommerce events (add_to_cart, purchase, ...) to GA4 as well, or page views only? Default: forward (small, one code path). Options: forward / page views only / forward later.
- **Q-GA4:** GA loads without consent and sets cookies, and demo/localhost traffic will count in the property. Accept? Default: accept, document in TRAFFIC_GUIDE, owner creates an internal-traffic filter in GA4 if wanted, and sets `NEXT_PUBLIC_GA_ENABLED=false` in `.env.local`. Options: accept / add a minimal consent note in the footer / implement Consent Mode (not recommended, out of scope).

## 2026-10-14 - M3 Cart, checkout, confirmation

1. **New theme breakpoint `xs` (`--breakpoint-xs: 22.5rem`, 360 px) in `app/globals.css` `@theme`, used instead of arbitrary `min-[360px]:` variants.**
   Why: the convention is token-only classes (no arbitrary values). Inline input + button pairs (promo code, newsletter) stack below 360 px and sit in a row from `xs`. Designer CR 5; DESIGN_TOKENS sections 3, 6 and 7 updated. The shipping radio likewise uses `accent-accent` instead of `accent-[var(--color-accent)]`.
2. **Postcode rules per country in clean mode: NL `1234 AB` (space optional, any case), BE exactly 4 digits, DE and FR exactly 5.**
   Why: more realistic than the PLAN wording "BE/DE/FR 4-5 digits", and the error message names a matching example. Tester accepted it as not a failure. Code: `lib/checkout/validation.ts`.
3. **`FIELD_ORDER` follows the visual order (postcode before city).**
   Why: submit focuses the first invalid field; with city first, focus skipped the postcode error (Designer CR 4, must-fix).
4. **The "Processing…" button stays accent-coloured with white text while `disabled` + `aria-busy`** (`aria-busy:bg-accent! aria-busy:text-white! aria-busy:cursor-progress` in the primary variant). Other disabled buttons (e.g. "Sold out") stay grey.
   Why: a grey button at the payment moment reads as broken (Designer CR 1, must-fix). Code: `components/ui/Button.tsx`.
5. **The cart page always prices standard shipping; the shipping method is chosen only at checkout.** Card values live only in `CheckoutForm` state and are never stored in the order, storage, logs or tracking.
   Why: PLAN section 9; keeps the demo free of anything that looks like real payment data.

## 2026-10-14 - M2 Catalogue and cart store

1. **PDP thumbnails are 80x100 px (`h-25 w-20`), not square `size-20`.**
   Why: the product art is 4:5; a 4:5 tile shows it whole instead of letterboxing it. Designer approved; DESIGN_TOKENS section 9 updated.
2. **From `lg` up the PDP thumbnails form a vertical rail left of the main image** (DOM order stays main image first; `lg:flex-row-reverse`). Below `lg` they stay in a row under the image.
   Why: at 1280x800 the 4:5 main image filled the viewport and pushed the thumbnails below the fold, so visitors (and heatmaps) would not see the other views (Designer CR 1, must-fix). Code: `components/product/ProductGallery.tsx`.
3. **Choosing Featured in the PLP sort writes `?sort=featured`** (instead of removing the param). Missing or invalid `?sort=` still renders Featured.
   Why: an explicit choice is kept in the URL, which is simpler and consistent; Designer and Tester accepted it. Code: `components/product/PlpListing.tsx`.
4. **No size is preselected on the PDP.**
   Why: PLAN section 9 requires it, and it is what makes the clean "Please select a size" error (and the M4 `silentSize` friction) observable. Code: `components/product/SizeSelector.tsx`, `PurchasePanel.tsx`.
5. **Cart state is a module-level external store read with `useSyncExternalStore`, not a context + reducer holding the items.** Drawer UI state stays in `CartProvider` (`useCartUi`).
   Why: the server snapshot is the empty cart, so the header count hydrates without mismatch; the store syncs across tabs via the `storage` event; and `useCart()` works in any client component. Code: `lib/cart/store.ts`, `lib/cart/CartProvider.tsx`.

## 2026-10-14 - M1 Foundation and brand

1. **Scaffold: Next.js 16.4 (`create-next-app@latest`), React 19.3, Tailwind v4, with `cacheComponents` and `partialPrefetching` disabled.**
   Why: the scaffold enables both by default, but the plan relies on route segment config (`dynamicParams = false` on PLP/PDP, `dynamic = 'force-dynamic'` on API routes), which is not available with Cache Components. See the comment in `next.config.ts`. `turbopack.root` is pinned to the repo so a stray parent lockfile is ignored.
2. **Header cart stays a link to `/cart`. Only Add to cart opens the mini-cart drawer** (the drawer has its own "View cart" link).
   Why: a real `/cart` page view keeps the funnel step clean in Contentsquare and avoids two competing cart paths (Designer answer, DESIGN_TOKENS section 7).
3. **Typography: system font stack, light theme only** (Geist and the dark-mode block from the scaffold removed; `color-scheme: light`).
   Why: builds without network access (no `next/font/google`), and one theme keeps the demo simple and screenshots consistent.
4. **Two extra silhouettes: `daypack` (Daypack 18) and `zip-wallet` (Travel wallet), so 24 distinct drawings for 24 products.**
   Why: Designer review found Daypack 18 / Trailhead 28 and Slim card wallet / Travel wallet were identical drawings. PLAN section 4 updated.
5. **Mobile menu test ids: `mobile-menu-button` and `mobile-nav-link-<slug>`** (desktop keeps `nav-link-<slug>`).
   Why: both navs are in the DOM, so ids must be unique per nav for stable Playwright selectors.
6. **Designer and Tester must not run `next start` at the same time.**
   Why: the Playwright `webServer` runs `npm run build`, which rewrites `.next/` and breaks any other `next start` from the same folder (seen in M1 when the Designer ran on port 3200). Run them one after the other, or the Designer uses `next dev`.

## 2026-10-14 - Answers to Planner questions (from the owner)

1. **Global flag store: Upstash Redis via the Vercel Marketplace** (not Edge Config).
   Why: one-click setup with auto-injected env vars, instant consistency, generous free tier, and no account-wide Vercel API token needed. Must still fall back gracefully to env vars + URL overrides when the store is not configured.
2. **PIN and store setup: store created after the build.** Owner sets `DEMO_CONTROLS_PIN` (6+ digits) in Vercel and `.env.local`. During the build the Tester verifies live toggles against a local in-memory store; the real Upstash store is created by the owner at deploy time. No `VERCEL_API_TOKEN` required.
3. **Default flag state: every friction flag ON except `expressShippingError`.** Phase A (baseline) = 8 flags on; Phase B = turn `expressShippingError` on; Phase C (fixed) = turn `expressShippingError` and `postcodeValidation` off. `friction_profile`: `express_error` if expressShippingError on; `clean` if all off; `fixed` if postcodeValidation off (and express off); else `baseline`.
4. **Checkout countries: NL (default), BE, DE, FR. Express error trigger: postcodes starting with "10".** Strict postcode validation rejects valid formats like "1234 AB" / "1234ab" on first attempt.
5. **Cookie consent: no banner** (Planner default; owner did not override). Contentsquare privacy settings are configured to collect without consent; the traffic guide lists this as a setup check. **Superseded 2026-10-15: a consent banner now exists (see top entry).**

## 2026-10-14 - Agents run as general-purpose subagents
The orchestrating session started in the parent folder, so project agents in `.claude/agents/` were not registered. Each role is run as a general-purpose subagent instructed to read and follow its role file. Sessions opened inside the repo can use the named agents directly.

## 2026-10-14 - Vercel setup
1. **Vercel project named `tidewild-demo` (lowercase), scope `berteniris-spec`, linked to the GitHub repo.**
   Why: Vercel project names must be lowercase and the folder name has capitals. Git link gives auto-deploys on push.
2. **Vercel Authentication (SSO protection) turned off via `vercel project protection disable tidewild-demo --sso`.**
   Why: it is on by default and blocks both visitors and the Contentsquare tag. The CLI is used because the dashboard may not show the setting and the Vercel MCP token has no access to this scope (403).
3. **`FLAG_STORE` left unset on Production.**
   Why: it auto-detects Upstash from the injected `KV_*` vars, and `memory` is refused on Vercel. Upstash for Redis (`upstash-kv-camel-park`) was provisioned with `vercel integration add upstash/upstash-kv`, as decided in the Planner answers.
4. **`DEMO_CONTROLS_PIN` is a sensitive Vercel env var and is not recorded in the repo.** The owner holds it.

## 2026-10-14 - M6 live toggles and control panel
1. **Auth by `x-demo-pin` header, no cookie; PIN kept in sessionStorage `tw-demo-pin`, cleared by Lock.** Compare via SHA-256 + `timingSafeEqual`; wrong PIN delayed about 500 ms; unset PIN disables the panel.
   Why: no session infrastructure needed, nothing persists beyond the tab, and the public read API stays cacheable.
2. **Public `GET /api/flags` is CDN-cached (`s-maxage=10`, `stale-while-revalidate=20`) and returns no history.**
   Why: cheap for visitors; a flip reaches new visitors in about 60 s. Auth'd panel routes are `no-store`.
3. **Store selection: `none` > `memory` (refused on Vercel) > `upstash` > auto-detect; Upstash via plain `fetch`, 1500 ms timeout, key `tw:friction`.**
   Why: no SDK dependency; `memory` must never be usable in production, and e2e must never reach the real store (the M6 config blanks all Upstash vars).
4. **Unconfigured or failing store never breaks the shop** (200 `configured:false` / `error:true`; flags fall back to env then defaults). The panel surfaces 503/502.
5. **`FlagsProvider.ready` waits up to 1.5 s for the global fetch.**
   Why: `page_view` and `friction_*` variables must carry the right flag state; trade-off is a `page_view` up to about 1.5 s late.
6. **Read-modify-write without locking; history capped at 30 (20 shown).** Accepted for a single presenter.
7. **Separate Playwright config `playwright.m6.config.ts` (`npm run test:m6`).**
   Why: panel tests mutate the global store and need five differently configured servers, so they cannot share the main suite.
8. **Reset-to-defaults button deferred to M7, then deliberately not applied** (needs a PLAN section 9 line and a new API action; the panel's All friction OFF / per-switch controls cover the need).

## M7 (2026-10-15)

1. **Designer M7 outcome: APPROVED.** CR 1 (hero slow-visibility / empty frame) fixed and re-approved. CR 2 (gallery tweak `aspect-square lg:aspect-[4/5]`) and the Reset-to-defaults button deliberately not applied.
2. **Optional `scripts/traffic/` persona script not built.** Why: hand-made sessions are more convincing and the bot-filtering caveat applies; `TRAFFIC_GUIDE.md` covers manual generation.
3. **Focus-drop item fixed (post-M7):** panel master buttons use `aria-disabled` and ignore clicks while busy instead of `disabled`; focus is kept (accepted trade-off: they stay focusable and are announced as unavailable). The 8 expected-failure tests were un-marked.
4. **Bare deployment shows the baseline (8 flags ON).** Why: code defaults are the Phase A state; the clean state is explicit (`?friction=all:off` or All friction OFF).
5. **GA cookies without a banner (superseded 2026-10-15 by the consent banner)** (Q-GA4/Q5) documented in `TRAFFIC_GUIDE.md` section 3, along with GA4 internal-traffic filtering.

- 2026-10-15: Owner confirmed the Contentsquare project has no domain allow-list (only IP blocking, empty). Earlier "allow-list tidewild-demo.vercel.app" instructions were wrong and are corrected in the current docs; BRIEF, PLAN and TEST_REPORT keep the original wording as history.
