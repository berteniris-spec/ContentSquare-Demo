# Decisions

Newest first. Each entry: decision, why, date.

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
5. **Cookie consent: no banner** (Planner default; owner did not override). Contentsquare privacy settings are configured to collect without consent; the traffic guide lists this as a setup check.

## 2026-10-14 - Agents run as general-purpose subagents
The orchestrating session started in the parent folder, so project agents in `.claude/agents/` were not registered. Each role is run as a general-purpose subagent instructed to read and follow its role file. Sessions opened inside the repo can use the named agents directly.
