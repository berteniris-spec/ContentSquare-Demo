# Tracking

Status: **built (M5)**. Contract: `docs/PLAN.md` section 8. Tests: `tests/tracking.spec.ts`, `tests-variants/variants.spec.ts`.

Verified only with stubs (Playwright intercepts `t.contentsquare.net` and the Google hosts). **Not verified**: GA4 Realtime/DebugView and the real Contentsquare UI. See "Manual checks".

## Code map

| File | Role |
|---|---|
| `lib/tracking/uxa.ts` | Contentsquare env (`CS_TAG_ID`, `CS_ENABLED`, `CS_SRC`), `uxaPush`, `trackVirtualPageview`, `trackDynamicVariable`, `pushFrictionVariables`, `frictionState` |
| `lib/tracking/ga.ts` | GA env (`GA_ID`, `GA_ENABLED`, `GA_SRC`), `isUntrackedPath`, idempotent `ensureGtag()`, `sendGaEvent()` |
| `lib/tracking/track.ts` | `track(event, data)` plus `trackViewItem/AddToCart/RemoveFromCart/BeginCheckout/Purchase`, item builders |
| `lib/tracking/pageType.ts` | `pathToPageType(pathname)` |
| `components/tracking/ContentsquareTag.tsx`, `GoogleAnalyticsTag.tsx`, `PageTypeSync.tsx` | mounted in `app/layout.tsx` (after `FlagsProvider`) |
| `components/tracking/RouteTracker.tsx` | mounted in `app/(shop)/layout.tsx` inside `<Suspense fallback={null}>` |

Call sites: `PurchasePanel.tsx` (`view_item`, `add_to_cart`), `CartView.tsx` (`remove_from_cart`), `CheckoutForm.tsx` (`begin_checkout`), `ConfirmationView.tsx` (`purchase`, `order_value`).

## Env vars (all `NEXT_PUBLIC_*`, build time: a redeploy applies changes)

| Name | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_CS_TAG_ID` | `506730812ef03` | Builds `https://t.contentsquare.net/uxa/<id>.js`. Must be alphanumeric, otherwise the tag is off |
| `NEXT_PUBLIC_CS_ENABLED` | `true` | `false` = no script, no `_uxa` pushes (dataLayer still works) |
| `NEXT_PUBLIC_GA_ID` | `G-4PLJ26X0Y9` | GA4 measurement id. Must match `^G-[A-Z0-9]+$`, otherwise GA is off |
| `NEXT_PUBLIC_GA_ENABLED` | `true` | `false` = no GA script, no `gtag` calls, no `js`/`config` entries |

Recommended in `.env.local`: `NEXT_PUBLIC_GA_ENABLED=false` so localhost does not hit the real property.

## Where tags load

- Both tags load on every shop route and on the 404 page, `strategy="afterInteractive"` via `next/script`.
- **Neither tag exists on `/demo-controls`** (owner-confirmed): no script, no `window.gtag`, no `config`.
- 404 page: tags and `data-page-type="not-found"` are present, but no `page_view` (RouteTracker lives in the shop layout).
- Open owner questions on GA (Enhanced Measurement, ecommerce forwarding, cookies/internal traffic) were resolved with the planner defaults: see `docs/DECISIONS.md`.

## Contentsquare

1. `ContentsquareTag` renders an inline `window._uxa = window._uxa || [];` (`#cs-init`) and the tag script (`#cs-src`); `onLoad` sets `window.__csLoaded = true`.
2. **Initial page**: no manual `trackPageview` (the tag records the natural page view).
3. **Route change** (pathname or search changes): `RouteTracker` pushes `['trackPageview', '<pathname>?<search>']` only if `__csLoaded` is true, then the dynamic variables. A change to the same location does nothing.
4. **Dynamic variables** on every page view (once flags are `ready`), as `['trackDynamicVariable', { key, value }]`:
   `friction_promo_field`, `friction_shipping_surprise`, `friction_decoy_banner`, `friction_buried_cta`, `friction_dead_swatch`, `friction_silent_size`, `friction_slow_hero`, `friction_postcode_validation`, `friction_express_error` (values `on`/`off`) and `friction_profile` (`baseline|express_error|fixed|clean`). Names come from `FLAG_META[].dynamicVarKey` in `lib/config.ts`.
5. **`order_value`**: `['trackDynamicVariable', { key: 'order_value', value: 142.2 }]` once per order on `/confirmation` (number, 2 dp).

```js
_uxa: [
  ['trackPageview', '/product/field-tote?friction=silentSize:on'],
  ['trackDynamicVariable', { key: 'friction_promo_field', value: 'on' }],
  // ... eight more friction_* ...
  ['trackDynamicVariable', { key: 'friction_profile', value: 'baseline' }],
]
```

## Google Analytics 4

- `GoogleAnalyticsTag` renders `<Script id="ga-src" src="https://www.googletagmanager.com/gtag/js?id=G-4PLJ26X0Y9">`. Implemented with `next/script` (no `@next/third-parties`, no new dependency).
- `ensureGtag()` (`lib/tracking/ga.ts`) is idempotent (`window.__gaInit`): keeps one shared `window.dataLayer` (never reassigned), defines `window.gtag` to push `arguments`, and queues `['js', Date]` then `['config', 'G-4PLJ26X0Y9']` once. `track()` also calls it, so `js`/`config` always precede any event even when `view_item` fires before the script component renders.
- `config` uses default settings; GA4 sends the first `page_view` itself. **No manual `page_view`** on route changes: relies on Enhanced Measurement "page changes based on browser history events" (GA4 default; planner default for Q-GA2).
- Only `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase` are forwarded as `gtag('event', name, ecommerce)` from inside `track()`. The plain `page_view`, friction data and PII are never sent to GA.
- GA sets first-party `_ga` / `_ga_<id>` cookies. No consent banner (DECISIONS Q5), no Consent Mode. `docs/TRAFFIC_GUIDE.md` section 3 states this and how to set Contentsquare privacy settings.
- Friction state is a Contentsquare feature and is not sent to GA.

## `window.dataLayer`

One array with two entry shapes:
- plain objects `{ event, ... }` pushed by `track()` (what tests and GTM-style readers use);
- gtag `Arguments` objects (`['js', Date]`, `['config', id]`, `['event', name, params]`).

Tell them apart with `typeof e.event === 'string'` versus `e[0] === 'event'`. Helpers: `tests/tracking-helpers.ts` (`readDL`, `plainEvents`, `gtagEntries`, `gtagEvents`, `uxa`).

### Events

`item` = `{ item_id: 'p02', item_name, item_category, item_variant?, price, quantity }`. Amounts are numbers rounded to 2 dp, currency `EUR`. `item_variant` is `"<colour> / <size>"` or just `"<colour>"` for unsized products; `view_item` has no variant.

| Event | When | GA forwarded |
|---|---|---|
| `page_view` | Once per pathname + search after flags are ready (initial load and each route change). Not on 404, not on `/demo-controls` | no |
| `view_item` | PDP mount (once per slug; a ref guard in `PurchasePanel` stops the dev-only Strict Mode double push) | yes |
| `add_to_cart` | Successful add. Not when the size is missing or `silentSize` blocks it | yes |
| `remove_from_cart` | Cart "Remove" only. Quantity steppers do not fire it | yes |
| `begin_checkout` | `/checkout` mount with a non-empty cart, once per visit (pushed before that page's `page_view`) | yes |
| `purchase` | `/confirmation`, once per order (stored `purchaseTracked` guard; not on reload, back or revisit) | yes |

```js
{ event: 'page_view', page_type: 'pdp', page_path: '/product/field-tote',
  friction: { promoField: 'on', shippingSurprise: 'on', decoyBanner: 'on', buriedCta: 'on',
              deadSwatch: 'on', silentSize: 'on', slowHero: 'on', postcodeValidation: 'on',
              expressShippingError: 'off' },
  friction_profile: 'baseline' }

{ event: 'view_item', ecommerce: { currency: 'EUR', value: 79,
    items: [{ item_id: 'p02', item_name: 'Field tote', item_category: 'bags', price: 79, quantity: 1 }] } }

{ event: 'add_to_cart', ecommerce: { currency: 'EUR', value: 158,
    items: [{ item_id: 'p02', item_name: 'Field tote', item_category: 'bags', item_variant: 'moss', price: 79, quantity: 2 }] } }

{ event: 'remove_from_cart', ecommerce: { currency: 'EUR', value: 158, items: [ /* the line, full quantity */ ] } }

// value = subtotal minus discount, no shipping; coupon key only with a promo
{ event: 'begin_checkout', ecommerce: { currency: 'EUR', value: 142.2, coupon: 'DEMO10', items: [ /* cart lines */ ] } }

{ event: 'purchase', ecommerce: { transaction_id: 'TW-482915', value: 142.2, currency: 'EUR',
    shipping: 0, discount: 15.8, coupon: 'DEMO10', items: [ /* order lines */ ] } }
```

Example values are illustrative; real ids, names and prices come from `lib/products.ts`. `coupon` is omitted without a promo. No email, address or card data in any push.

GA forwarding example: `['event', 'add_to_cart', { currency: 'EUR', value: 158, items: [...] }]`.

## `data-page-type`

`PageTypeSync` sets `document.body.dataset.pageType` on every route via `pathToPageType`: `home`, `plp` (incl. `/category/all`), `pdp`, `cart`, `checkout`, `confirmation`, `demo-controls`, `not-found` (unknown paths and unknown slugs). Stable `data-testid`s: PLAN section 8.

## Tests

- `npm run test:e2e` runs `tests/tracking.spec.ts` (CS tag, virtual page views, dynamic variables per flag state, every event payload, once-only purchase, page types, selectors, GA) against stubs from `tests/fixtures.ts` (`csRequests`, `gaRequests`).
- `npm run test:variants` runs `tests-variants/variants.spec.ts` four times via `playwright.variants.config.ts` (`VARIANT=disabled|override|invalid|dev`, each rebuilds on port 3000): tags off, overridden ids, invalid ids rejected, and `next dev` (React Strict Mode double effects: each business event, `page_view`, `js`/`config` and `order_value` fire once).

## Manual checks (cannot be automated)

1. GA4 Realtime / DebugView: hard loads and SPA navigations each show one page view; a test purchase appears once with the right `transaction_id` and value.
2. Contentsquare: after allow-listing `tidewild-demo.vercel.app`, confirm the tag consumes `_uxa` (virtual page views as separate pages, `friction_*` and `order_value` visible as dynamic variables). Set up segments on `friction_*`.
