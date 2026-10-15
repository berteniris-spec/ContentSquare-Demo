# Architecture

Status: reflects the code after M6. Planned parts are marked with their milestone. Full target structure: `docs/PLAN.md` section 3.

## Stack

- Next.js 16.4 App Router, React 19.3, TypeScript strict, Tailwind CSS v4 (via `@tailwindcss/turbopack`). No UI libraries.
- `next.config.ts`: `cacheComponents` and `partialPrefetching` are off (route segment config is needed); `turbopack.root` is pinned to the repo.
- Read `AGENTS.md` before writing Next.js code: this Next version differs from older docs. The guides are in `node_modules/next/dist/docs/`.

## Folder structure (current)

```
app/
  layout.tsx            # <html lang="en-GB">, globals.css, SkipLink, default metadata; FlagsProvider around children, then ContentsquareTag, GoogleAnalyticsTag, PageTypeSync
  globals.css           # Tailwind v4 import + @theme tokens (DESIGN_TOKENS.md), incl. --breakpoint-xs 22.5rem
  icon.svg              # favicon (tide glyph)
  not-found.tsx         # branded 404 with shop chrome
  (shop)/               # route group, no URL segment
    layout.tsx          # CartProvider > ShopShell + MiniCartDrawer + RouteTracker (in Suspense)
    page.tsx            # /  Hero, CategoryTiles, FeaturedRow, ValuesStrip, NewsletterSignup
    category/[slug]/    # /category/bags|apparel|accessories|all, static, dynamicParams=false; PlpListing in Suspense
    product/[slug]/     # /product/<slug>, static, dynamicParams=false; ProductDetail + story + RelatedProducts
    cart/               # /cart  H1 + CartView
    checkout/           # /checkout  H1 + DemoBanner + CheckoutForm
    confirmation/       # /confirmation  ConfirmationView
  api/hero-image/route.ts  # slowHero: force-dynamic SVG, ~3.0 s delay, ~1.73 MB (12,000 strokes), no-store
  api/flags/route.ts       # GET public global flags (CDN-cached s-maxage=10, swr=20); body {configured, store, flags, updatedAt}
  api/demo-controls/flags/route.ts # GET/POST, PIN via x-demo-pin, no-store; toggle / all_on / all_off / only_fix_errors
  demo-controls/        # layout: robots noindex,nofollow, minimal chrome (no tags); page renders ControlPanel with isPinConfigured()
  robots.ts             # disallow /demo-controls and /api/
components/
  cart/     CartView (client), CartLineItem, OrderSummary, SummaryRows (shared by cart/checkout/confirmation),
            PromoCode (client), FreeShippingHint, EmptyCart (also used for the empty checkout)
  demo-controls/ ControlPanel (client: PIN, fetches, state), FlagRow, Switch (role=switch), History, types
  checkout/ CheckoutForm (client, owns form state), TextField, ShippingMethod, CheckoutSummary (+ SummaryLines), DemoBanner
  confirmation/ ConfirmationView (client)
  home/     Hero, HeroImage (client, flag-aware), CategoryTiles, FeaturedRow, ValuesStrip, NewsletterSignup (client)
  layout/   Header (client), Footer, Wordmark, CartButton (client), MiniCartDrawer (client), SkipLink, ShopShell, PagePlaceholder, nav.ts
  product/  ProductCard, ProductGrid, PlpListing + SortSelect (client), PurchasePanel (exports ProductDetail),
            ProductGallery, ColourSwatches, SizeSelector, QuantityStepper (optional `label`, `size`), RelatedProducts, DecoyBanner (decoyBanner), ProductStory (short/long, buriedCta);
            svg/ProductImage (renderer), silhouettes.tsx (SILHOUETTES map), color.ts (palette)
  tracking/ ContentsquareTag, GoogleAnalyticsTag, PageTypeSync (all in app/layout.tsx), RouteTracker (in the (shop) layout)
  ui/       Button (+ ButtonLink, buttonClasses), Field (inputClasses, labelClasses, FieldError), Select, Price, icons
lib/
  config.ts    # shop constants, friction targets, COUNTRIES, FlagKey, FRICTION defaults, FLAG_META, FLAG_KEYS
  products.ts  # types, CATEGORIES, PRODUCTS (24), getCategory/getByCategory/getBySlug/getById/getFeatured/getRelated/sortProducts/parseSort
  format.ts    # formatPrice (Intl EUR), pluralise
  pricing.ts   # pure pricing: roundCents, lineTotal, subtotal, isValidPromo, discount, shipping, awayFromFreeShipping, totals
  order.ts     # Order type, generateOrderNumber (TW- + 6 digits), saveLastOrder, getLastOrderSnapshot/subscribeLastOrder, markPurchaseTracked
  flags/env.ts        # NEXT_PUBLIC_FRICTION_* -> ENV_FLAGS (literal process.env reads), parseToggle
  flags/overrides.ts  # ?friction= parser (applyOverrideParam), sessionStorage tw-friction-overrides, external store
  flags/resolve.ts    # pure resolveFlags (override > global > env > defaults), deriveProfile
  flags/FlagsProvider.tsx # client provider; useFlag(key), useFlags() -> { flags, profile, ready }; fetches /api/flags (global layer)
  flags/store/types.ts    # FlagStore, FlagStorePayload {flags, updatedAt, flagHistory}, FlagAction, HISTORY_CAP (30)
  flags/store/index.ts    # getStore(): FLAG_STORE none|memory|upstash|auto; memory refused when VERCEL is set
  flags/store/memory.ts   # in-process store (local/e2e)
  flags/store/upstash.ts  # Upstash REST via fetch, Bearer token, 1500 ms timeout, key tw:friction
  flags/pin.ts            # isPinConfigured, checkPin (SHA-256 then timingSafeEqual)
  flags/payload.ts        # sanitizePayload, parseAction, applyAction (one write, history, per-flag updatedAt), describeEffective
  flags/server.ts         # readPayload, fullState, requirePin (401 delayed ~500 ms, 503 pin_not_configured), NO_STORE headers
  tracking/uxa.ts     # Contentsquare env + _uxa helpers (trackVirtualPageview, trackDynamicVariable, pushFrictionVariables, frictionState)
  tracking/ga.ts      # GA env, isUntrackedPath, idempotent ensureGtag, sendGaEvent
  tracking/track.ts   # track(event, data) -> window.dataLayer (+ GA for 5 ecommerce events), trackViewItem/AddToCart/RemoveFromCart/BeginCheckout/Purchase
  tracking/pageType.ts # pathToPageType
  checkout/expressRate.ts # expressShippingError: zone lookup that throws a TypeError for postcodes starting 10
  checkout/validation.ts  # pure validators: FIELD_ORDER, validateEmail/Postcode/CardNumber/Expiry/Cvc, validateField, validateAll
  cart/store.ts         # external cart store: reducer, localStorage tw-cart-v1, subscribe/getSnapshot/dispatch
  cart/CartProvider.tsx # CartProvider (drawer UI state), useCart(), useCartUi()
public/images/hero.svg  # homepage hero art
types/global.d.ts  # window._uxa, window.__csLoaded, window.dataLayer
tests/             # Playwright: fixtures.ts (CS + Google stubs), tracking-helpers.ts, smoke, shell, catalogue, checkout, friction, friction-matrix, flags-unit-m6 (node-level), flags-store, tracking, screenshots specs
tests-variants/    # variants.spec.ts: build-time tag variants + Strict Mode (npm run test:variants)
playwright.config.ts
playwright.variants.config.ts  # VARIANT=disabled|override|invalid|dev
playwright.m6.config.ts        # M6 panel suite: one build, five servers (ports 3000, 3101-3104), serial
tests-panel/       # panel.spec.ts, fallback.spec.ts, helpers.ts (npm run test:m6)
```

Nothing in the PLAN structure is outstanding for M6; M7 is polish and handover.

## Key components

- **ShopShell** (`components/layout/ShopShell.tsx`): Header, `main#main[tabindex=-1]` (skip-link target), Footer. Used by `(shop)/layout.tsx`. `/demo-controls` has its own layout without shop chrome.
- **Header** (client): sticky bar with wordmark, desktop nav (`nav-link-<slug>`, `aria-current`), mobile menu (`mobile-menu-button`, `mobile-nav-link-<slug>`; Esc closes and returns focus, closes on route change), `CartButton`.
- **CartButton**: a link to `/cart` (it never opens the drawer); reads `useCart().count`, shown only after hydration and hidden at 0; accessible name "Cart, empty" / "Cart, N items".
- **ProductDetail** (`components/product/PurchasePanel.tsx`, client): owns PDP state (colour, view, size, qty, size error); renders `ProductGallery` and the purchase controls; on Add to cart calls `useCart().addItem` then `useCartUi().openDrawer("added", addButton)`.
- **PlpListing** (client): reads `?sort=` with `useSearchParams`, sorts with `sortProducts`, writes the choice with `router.replace(..., { scroll: false })`. Wrapped in `Suspense` with `PlpListingFallback` (featured order, select disabled) so the static HTML is complete.
- **MiniCartDrawer** (client): rendered only while `drawerOpen`; manages focus (to Close on open, Tab trap, return to the opener on close), Esc, body scroll lock.
- **CartView** (client): reads `useCart()`; spacer before hydration, `EmptyCart` when empty, else lines + `OrderSummary` with `totals(items, promo, "standard")`.
- **OrderSummary / SummaryRows**: `SummaryRows` renders the subtotal / discount / shipping / total `<dl>` for cart, checkout and confirmation (`testIdPrefix` sets the test ids). M4 hook props: `OrderSummary.promoVariant` (`collapsed` | `prominent`) and `shippingDisplay` (`amount` | `deferred`).
- **PromoCode** (client): disclosure, input and messages; calls `useCart().applyPromo/removePromo`, validates with `isValidPromo`.
- **CheckoutForm** (client): holds field values, errors, shipping method and the processing flag in component state (card data never leaves it). Validates through `lib/checkout/validation.ts`, computes totals with `lib/pricing.ts`, renders `CheckoutSummary` (whose Pay button submits via `form="checkout-form"`). M4 hooks: `validateOpts.strictPostcode` and `onShippingChange`.
- **ConfirmationView** (client): reads the last order with `useSyncExternalStore(subscribeLastOrder, getLastOrderSnapshot)`; renders the order or the no-order state.
- **ProductImage** (`components/product/svg/ProductImage.tsx`): renders `product.silhouette` for a colour and view (`front|back|side|detail`) from `SILHOUETTES`; `color.ts` derives shade/highlight/outline from the colour hex. One silhouette per product (24 total).

## State and data flow

- Catalogue: static data in `lib/products.ts`; PLP/PDP pages are statically generated with `generateStaticParams` and unknown slugs 404.
- Cart (M2): see below. Last order (M3): see "Order flow" below.
- Friction flags (M4, global layer M6): see "Flag resolution" below.
- Tracking (M5): see "Tracking flow" below and `docs/TRACKING.md`.

### Flag resolution (M4, global layer M6)

- `FlagsProvider` (`lib/flags/FlagsProvider.tsx`) is mounted in `app/layout.tsx`, so it covers the shop and `/demo-controls`.
- Resolver `resolveFlags({ override, global, env, defaults })`: override (`?friction=` / sessionStorage `tw-friction-overrides`) > global (fetched from `/api/flags`, empty if unconfigured or failing) > env (`NEXT_PUBLIC_FRICTION_*`, inlined at build) > `FRICTION` defaults in `lib/config.ts`. With defaults, 8 flags are ON (profile `baseline`), `expressShippingError` OFF.
- Server render and the first client render use env + defaults only. Overrides come from an external store read with `useSyncExternalStore` (server snapshot = empty), so they apply after hydration without a mismatch; `persistOverrides()` runs on first load and on each pathname change and writes the URL param to sessionStorage.
- Global layer (M6): `FlagsProvider` fetches `GET /api/flags` once after mount (`cache: no-store`) and again on a route change if the last fetch is older than 30 s. Failures are silent (layer stays empty). `ready` becomes true when overrides are applied and the fetch has finished, or after at most 1.5 s, so `page_view` can arrive up to about 1.5 s after load.
- Components read flags only via `useFlag(key)`; `useFlags()` adds `profile` (`deriveProfile`) and `ready` (false until mounted). `HeroImage` shows the static `/images/hero.svg` until `ready` and requests `/api/hero-image` only when `slowHero` resolves ON.
- `RouteTracker` reads `flags`, `profile` and `ready` for the dynamic variables and `page_view`. See `FRICTION_FLAGS.md`.

### Control panel and flag API (M6)

- `/demo-controls` (server page) passes `isPinConfigured()` to the client `ControlPanel`. The PIN lives in sessionStorage `tw-demo-pin` and goes in header `x-demo-pin` to `GET`/`POST /api/demo-controls/flags`.
- `requirePin` (`lib/flags/server.ts`): 503 `pin_not_configured`, 401 after about 500 ms on a wrong/missing PIN. Then `getStore()`: null -> 503 `store_not_configured`; store error -> 502 `store_error`; bad body -> 400.
- POST: `parseAction` -> `store.read` -> `applyAction` (computes changes against the currently resolved flags, per-flag `updatedAt`, history newest first capped at 30) -> one `store.write` of the whole payload under the key `tw:friction`. Read-modify-write, no locking.
- Public `GET /api/flags` returns only `{configured, store, flags, updatedAt}` (no history); no store -> 200 `configured:false`; store error -> 200 `error:true`.
- The panel shows `effective` values and their `source` (`global|env|default`) from `describeEffective`, plus the derived profile.

### Tracking flow (M5)

- Mounts: `app/layout.tsx` renders `ContentsquareTag`, `GoogleAnalyticsTag` and `PageTypeSync` after `FlagsProvider` (so they also see `/demo-controls`; the tags return null there). `RouteTracker` is in `app/(shop)/layout.tsx` inside `<Suspense fallback={null}>` (uses `useSearchParams`), so it never runs on `/demo-controls` or the 404 page.
- `RouteTracker`: waits for `useFlags().ready`, then once per pathname + search: (route changes only, and only if `window.__csLoaded`) `_uxa trackPageview`, then ten `trackDynamicVariable` pushes, then dataLayer `page_view`.
- Events: components call `trackViewItem`/`trackAddToCart`/`trackRemoveFromCart`/`trackBeginCheckout`/`trackPurchase` from `lib/tracking/track.ts`. `track()` calls `ensureGtag()` first, pushes `{ event, ... }` onto the shared `window.dataLayer`, and for the five ecommerce events also `gtag('event', ...)`. `gtag` pushes `Arguments` objects onto the same array.
- Once-only: `view_item` via a ref guard in `PurchasePanel`; `purchase` + `order_value` via the stored `purchaseTracked` flag re-read inside the effect in `ConfirmationView`.
- `PageTypeSync` sets `body.dataset.pageType` from `pathToPageType`.
- Tags are build-time configured (`NEXT_PUBLIC_CS_*`, `NEXT_PUBLIC_GA_*`; ids validated in `uxa.ts`/`ga.ts`).

### Cart state (M2)

Two layers, split so cart data works anywhere and drawer UI state stays in React:

1. **Store** (`lib/cart/store.ts`): a module-level external store, not React context.
   - State `{ items: CartItem[], promoCode: "DEMO10" | null }`. `CartItem` holds `key`, `productId`, `slug`, `name`, `colour`, `size?`, `unitPrice`, `quantity`.
   - `cartReducer` (pure) handles `add` (merge by key, clamp 1..10), `setQuantity`, `remove`, `applyPromo`, `removePromo`, `clear`.
   - `dispatch` runs the reducer, writes JSON to localStorage **`tw-cart-v1`** (errors ignored, e.g. private mode) and notifies listeners.
   - Storage is read lazily on the first client `getSnapshot` and sanitised (invalid lines dropped, keys rebuilt, quantities clamped, unknown promo -> null; bad JSON -> empty cart).
   - A `storage` event listener keeps other tabs in sync.
2. **React bindings** (`lib/cart/CartProvider.tsx`):
   - `useCart()`: reads the store with **`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`**. The server snapshot is always the empty cart, so the first client render matches the server HTML (no hydration mismatch). Also returns `hydrated` (via a second `useSyncExternalStore`), derived `count` and `subtotal` (from `lib/pricing.ts`), and the actions. Works outside the provider.
   - `CartProvider` + `useCartUi()`: drawer UI state only: `openDrawer(reason, returnFocusTo)`, `closeDrawer`, `drawerOpen`, `drawerReason` (`added` | `view`), `returnFocusRef`. The drawer is stored with the pathname it was opened on, so `drawerOpen` turns false on any navigation (and stays closed on Back).
   - `CartProvider` wraps the whole `(shop)` layout; `/demo-controls` has no cart.

Pricing is never computed in components: everything goes through `lib/pricing.ts` (constants in `lib/config.ts`: `FREE_SHIPPING_THRESHOLD` 75, `STANDARD_SHIPPING` 6.95, `EXPRESS_SHIPPING` 12.95, `PROMO` DEMO10 / 10%, `MAX_QTY` 10).

### Order flow (M3)

1. `/cart` and `/checkout` read the same cart store; totals come from `totals(items, promoCode, method)`.
2. Checkout submit runs `validateAll` (clean mode). If anything is invalid, errors render and focus moves to the first invalid field in `FIELD_ORDER` (visual order).
3. Valid: `processing` is set (button disabled, `aria-busy`, inputs disabled) and a 1.5 s timer starts.
4. When it fires, an `Order` (`lib/order.ts`: number, timestamp, email, items, totals, shipping method, promo, currency, `purchaseTracked: false`; no card data) is written to sessionStorage **`tw-last-order`** via `saveLastOrder`, which also notifies subscribers. Then `router.push('/confirmation')` and `cart.clear()` (items and promo). The form keeps rendering while `processing`, so the cleared cart does not flash the empty state.
5. `/confirmation` reads the snapshot (cached per raw string). Reload shows the same order; a new tab session has none. `ConfirmationView` uses `markPurchaseTracked` to fire `purchase` and `order_value` once (see Tracking flow).

## Testing

- `npm run test:e2e`: the Playwright `webServer` runs `npm run build && npm run start -p 3000` with `FLAG_STORE=memory`, `DEMO_CONTROLS_PIN=246810` and all nine `NEXT_PUBLIC_FRICTION_*` set to `off` (specs assert the clean behaviour; friction specs use `?friction=<flag>:on`). Friction specs: `tests/friction.spec.ts`, `tests/friction-matrix.spec.ts` (includes 4 node-level unit tests of the resolver/parser). `tests/fixtures.ts` stubs `t.contentsquare.net` and the Google hosts (`csRequests`, `gaRequests`); no real analytics hit is ever sent. `tests/tracking.spec.ts` + `tests/tracking-helpers.ts` cover tracking.
- `npm run test:m6` (`playwright.m6.config.ts`, `tests-panel/`): builds once, then starts five servers serially (3000 memory store + PIN 246810; 3101 `FLAG_STORE=none`; 3102 memory with empty PIN; 3103 memory + `VERCEL=1` to prove the refusal; 3104 `FLAG_STORE=upstash` with a fake unreachable URL, GET only). It sets `FLAG_STORE` explicitly and blanks all `KV_`/`UPSTASH_` vars so `.env.local` credentials and the real store are never used. `tests/flags-unit-m6.spec.ts` (node-level) and `tests/flags-store.spec.ts` run in the main suite.
- `npm run test:variants` (`playwright.variants.config.ts`, `tests-variants/`): runs four builds in sequence (`disabled`, `override`, `invalid`, `dev` = `next dev` for Strict Mode), each on port 3000.
- The build rewrites `.next/`. Do not run a second `next start` from this folder while tests run.
