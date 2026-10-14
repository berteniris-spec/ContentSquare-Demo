# Build plan: Contentsquare demo store

Owner: planner. Source of truth: `docs/BRIEF.md`. User answers: `docs/DECISIONS.md` (owner answers recorded 2026-10-14).

Status: **final**. All planner questions are answered (recommended defaults accepted, see `docs/DECISIONS.md` and section 12). No provisional sections remain.

---

## 1. Summary and principles

- Next.js 16 (App Router, TypeScript strict) + Tailwind CSS v4, scaffolded with `create-next-app@latest` (no `src/` dir, alias `@/*`, ESLint). No UI libraries. Runtime dependencies: `next`, `react`, `react-dom` only. Dev: Tailwind, ESLint, TypeScript, `@playwright/test`.
- All shop state is client-side (cart in localStorage, last order in sessionStorage). The only server-side state is the global friction flag store, accessed through API route handlers using plain `fetch` (no vendor SDK).
- Product images are React SVG components generated from product data (no image files except a hero SVG).
- Every friction item is gated by one flag through a single resolver (`useFlag(key)`). OFF means the clean behaviour, with no leftover markup.
- Routes are fixed by the brief: `/`, `/category/[slug]` (+ `/category/all`), `/product/[slug]`, `/cart`, `/checkout`, `/confirmation`, `/demo-controls`.
- Brand (proposal, Designer may refine): **Tidewild**, tagline "Made for the long way round." Text wordmark. Order number prefix `TW-`.

## 2. Milestones

| # | Milestone | Outcome |
|---|---|---|
| M1 | Foundation and brand | Scaffold, design tokens, shell layout (header/footer), catalog data (24 products), SVG imagery, placeholder pages for every route, Playwright set up |
| M2 | Catalogue and cart store | Homepage, PLP with sort, PDP (gallery, swatches, sizes, qty, related), cart store with persistence, header count, mini-cart drawer |
| M3 | Cart, checkout, confirmation | Cart page, promo `DEMO10`, shipping rule, single-page checkout with validation and processing state, confirmation, cart clear |
| M4 | Friction flags (local) | `lib/config.ts` flags, resolver (URL override > global placeholder > env > config), `FlagsProvider`, all 9 friction behaviours ON/OFF |
| M5 | Tracking | Contentsquare tag, virtual page views, dynamic variables (friction state, order value), data layer events, `data-page-type`, `data-testid` audit |
| M6 | Live toggles and control panel | Flag store adapter(s) + memory store, `/api/flags`, PIN-protected write API, `/demo-controls` panel with master buttons and `flagHistory`, graceful fallback |
| M7 | Hardening, polish, handover | Full regression desktop/mobile, a11y polish, optional traffic script, final docs (DEPLOYMENT, DEMO_SCRIPT, TRAFFIC_GUIDE), manual steps list |

Per-milestone loop (from brief): builder -> designer -> tester -> documenter; Designer/Tester issues go back to builder, then re-review. Exception: in M1 the Designer runs FIRST to write `docs/DESIGN_TOKENS.md`, then builder, then designer review.

## 3. Folder structure

```
app/
  layout.tsx                 # <html>/<body>, global CSS, FlagsProvider, ContentsquareTag, PageTypeSync, default metadata
  globals.css                # Tailwind v4 import + @theme tokens from DESIGN_TOKENS.md
  robots.ts                  # disallow /demo-controls
  not-found.tsx
  (shop)/                    # route group: no URL segment
    layout.tsx               # CartProvider, Header, MiniCartDrawer, Footer, RouteTracker
    page.tsx                 # /
    category/[slug]/page.tsx # /category/bags|apparel|accessories|all (generateStaticParams, dynamicParams=false)
    product/[slug]/page.tsx  # /product/<slug> (generateStaticParams, dynamicParams=false)
    cart/page.tsx
    checkout/page.tsx
    confirmation/page.tsx
  demo-controls/
    layout.tsx               # metadata robots noindex,nofollow; minimal chrome, no header/footer
    page.tsx
  api/
    flags/route.ts                  # GET public global flags (short CDN cache)
    demo-controls/flags/route.ts    # GET full state + history, POST changes (PIN required, no-store)
    hero-image/route.ts             # slowHero: delayed, oversized SVG
components/
  layout/      Header.tsx, Footer.tsx, Wordmark.tsx, CartButton.tsx, MiniCartDrawer.tsx
  home/        Hero.tsx, CategoryTiles.tsx, FeaturedRow.tsx, ValuesStrip.tsx, NewsletterSignup.tsx
  product/     ProductCard.tsx, ProductGrid.tsx, SortSelect.tsx, DecoyBanner.tsx, ProductGallery.tsx,
               ColourSwatches.tsx, SizeSelector.tsx, QuantityStepper.tsx, PurchasePanel.tsx, RelatedProducts.tsx
  product/svg/ ProductImage.tsx (renderer), silhouettes.tsx (one shape per product type, 4 views)
  cart/        CartLineItem.tsx, OrderSummary.tsx, PromoCode.tsx, EmptyCart.tsx
  checkout/    CheckoutForm.tsx, ShippingMethod.tsx, PaymentFields.tsx, DemoBanner.tsx, CheckoutSummary.tsx
  confirmation/ConfirmationView.tsx
  demo-controls/PinGate.tsx, ControlPanel.tsx, FlagRow.tsx, HistoryList.tsx
  tracking/    ContentsquareTag.tsx, RouteTracker.tsx, PageTypeSync.tsx
  ui/          Button.tsx, Price.tsx, Field.tsx, Switch.tsx (only what is reused)
lib/
  config.ts              # FRICTION defaults, FLAG_META, shop constants (threshold, rates, promo, special product slugs)
  products.ts            # catalog data + helpers (getByCategory, getBySlug, related, sort)
  format.ts              # Intl EUR formatter
  pricing.ts             # pure: subtotal, discount, shipping, total
  cart/CartProvider.tsx  # context + reducer + localStorage
  order.ts               # Order type, order number, lastOrder in sessionStorage
  checkout/validation.ts # pure validators (clean + strict postcode)
  flags/env.ts           # static NEXT_PUBLIC_FRICTION_* reads (must be literal process.env.X for inlining)
  flags/overrides.ts     # parse ?friction=, sessionStorage read/write
  flags/resolve.ts       # pure merge by priority + profile derivation
  flags/FlagsProvider.tsx# client context, fetch /api/flags, useFlag/useFlags
  flags/store/           # types.ts, index.ts (getStore()), upstash.ts, memory.ts (no Edge Config adapter)
  flags/pin.ts           # constant-time PIN check (server only)
  tracking/track.ts      # dataLayer push helper
  tracking/uxa.ts        # Contentsquare _uxa helpers (guarded)
  tracking/pageType.ts   # pathname -> page type
types/global.d.ts        # window._uxa, window.dataLayer
public/images/hero.svg   # light hero (clean)
tests/                   # Playwright specs (tester owned) + playwright.config.ts at root
docs/                    # BRIEF, PLAN, DECISIONS, DESIGN_TOKENS, DESIGN_REVIEW, TEST_REPORT + documenter files
```

## 4. Data model

```ts
// lib/products.ts
type CategorySlug = 'bags' | 'apparel' | 'accessories';
type Silhouette = 'backpack' | 'daypack' | 'tote' | 'duffel' | 'sling' | 'hip-pack' | 'sleeve'
  | 'jacket' | 'tee' | 'fleece' | 'vest' | 'shorts' | 'trousers' | 'hoodie' | 'shirt'
  | 'beanie' | 'cap' | 'wallet' | 'zip-wallet' | 'pouch' | 'bottle' | 'cube' | 'keyclip' | 'roll-top';
type ProductView = 'front' | 'back' | 'side' | 'detail';
interface Colour { name: string; slug: string; hex: string }
interface Product {
  id: string;            // 'p01'..'p24'
  slug: string;
  name: string;
  category: CategorySlug;
  price: number;         // EUR, e.g. 129
  description: string;   // 2-3 sentences (longer `story` only for the buriedCta product)
  story?: string[];      // long content paragraphs used by buriedCta
  features: string[];    // 3-4 bullets
  colours: Colour[];     // 2-4
  sizes?: string[];      // apparel only, e.g. ['XS','S','M','L','XL']
  stock: 'in_stock' | 'low_stock' | 'out_of_stock';
  silhouette: Silhouette;
  views: ProductView[];  // 3-4; images = <ProductImage product colour view />
  featured?: number;     // order in Featured row and "Featured" sort (lower first)
}

// lib/cart/CartProvider.tsx
interface CartItem {
  key: string;           // `${productId}:${colourSlug}:${size ?? '-'}`
  productId: string; slug: string; name: string;
  colour: string;        // colour slug
  size?: string;
  unitPrice: number;
  quantity: number;      // 1..10
}
interface CartState { items: CartItem[]; promoCode: 'DEMO10' | null }
// localStorage key: 'tw-cart-v1'

// lib/order.ts
interface Order {
  orderNumber: string;   // 'TW-' + 6 digits
  createdAt: string;     // ISO
  email: string;
  items: CartItem[];
  subtotal: number; discount: number; shipping: number; total: number;
  shippingMethod: 'standard' | 'express';
  promoCode: string | null;
  currency: 'EUR';
  purchaseTracked: boolean; // prevents duplicate purchase events on reload
}
// sessionStorage key: 'tw-last-order'. Never contains card data.

// lib/config.ts
type FlagKey = 'promoField' | 'shippingSurprise' | 'decoyBanner' | 'buriedCta'
  | 'deadSwatch' | 'silentSize' | 'slowHero' | 'postcodeValidation' | 'expressShippingError';
type FrictionFlags = Record<FlagKey, boolean>;
type Capability = 'funnel' | 'heatmaps' | 'replay' | 'errors';
interface FlagMeta { key: FlagKey; label: string; description: string; capability: Capability;
  envVar: string; dynamicVarKey: string }
export const FRICTION: FrictionFlags;   // all true except expressShippingError: false (Q3)
export const FLAG_META: FlagMeta[];

// lib/flags/store/types.ts : stored payload (single key 'friction')
interface FlagHistoryEntry {
  at: string;                         // ISO timestamp (server time)
  action: 'toggle' | 'all_on' | 'all_off' | 'only_fix_errors';
  changes: { flag: FlagKey; from: boolean | null; to: boolean }[];
}
interface FlagStorePayload {
  version: 1;
  flags: Partial<FrictionFlags>;      // only keys explicitly set from the panel
  updatedAt: Partial<Record<FlagKey, string>>;
  flagHistory: FlagHistoryEntry[];    // newest first, capped at 30 (panel shows 20)
}
interface FlagStore {
  name: 'upstash' | 'memory';
  read(): Promise<FlagStorePayload | null>;
  write(p: FlagStorePayload): Promise<void>;
}
```

Shop constants in `lib/config.ts`: `FREE_SHIPPING_THRESHOLD = 75`, `STANDARD_SHIPPING = 6.95`, `EXPRESS_SHIPPING = 12.95`, `PROMO = { code: 'DEMO10', rate: 0.10 }`, `MAX_QTY = 10`, and the friction targets `BURIED_CTA_SLUG`, `DEAD_SWATCH = { slug, colour }`, `SILENT_SIZE_SLUG`, `EXPRESS_ERROR_POSTCODE = /^10/` (Q4), `COUNTRIES = NL (default), BE, DE, FR`.

### Catalog (24 products, 8 per category; Builder may tweak names/prices)

- Bags: `trailhead-28-backpack` (EUR 139, **buriedCta**), `field-tote` (EUR 79, **deadSwatch** on colour `moss`), `daypack-18` (EUR 95), `roll-top-pack` (EUR 119), `weekender-duffel` (EUR 159), `city-sling` (EUR 59), `hip-pack` (EUR 45), `laptop-sleeve-14` (EUR 49).
- Apparel (sized): `storm-shell-jacket` (EUR 229, **silentSize**), `grid-fleece-pullover` (EUR 99), `packable-down-vest` (EUR 149), `merino-base-tee` (EUR 65), `organic-hoodie` (EUR 85), `canvas-overshirt` (EUR 89), `trail-shorts` (EUR 55), `rain-trousers` (EUR 119).
- Accessories: `wool-beanie` (EUR 29), `six-panel-cap` (EUR 32), `slim-card-wallet` (EUR 39), `tech-pouch` (EUR 35), `insulated-bottle` (EUR 34), `packing-cubes-set` (EUR 42), `key-clip` (EUR 15), `travel-wallet` (EUR 59).
- At least 6 featured. Mix of stock states (at least one `low_stock`, one `out_of_stock` with disabled Add to cart). Several items under EUR 75 so the shipping threshold is exercised.

## 5. Routes and API routes

| Route | Rendering | Page type (`data-page-type`) |
|---|---|---|
| `/` | static | `home` |
| `/category/[slug]` (`bags`, `apparel`, `accessories`, `all`) | static (generateStaticParams, `dynamicParams = false`); sort read client-side via `useSearchParams` in a Suspense boundary | `plp` |
| `/product/[slug]` | static (generateStaticParams, `dynamicParams = false`) | `pdp` |
| `/cart` | static shell, client content | `cart` |
| `/checkout` | static shell, client content | `checkout` |
| `/confirmation` | static shell, client content (reads lastOrder) | `confirmation` |
| `/demo-controls` | client, noindex, no tag, not linked | `demo-controls` |

Query strings allowed: `?sort=featured|price-asc|price-desc` on PLP (absent = featured), and `?friction=` anywhere.

| API route | Method | Auth | Cache | Behaviour |
|---|---|---|---|---|
| `/api/flags` | GET | none | `Cache-Control: public, max-age=0, s-maxage=10, stale-while-revalidate=20` (errors: `s-maxage=5`) | `{ configured: boolean, store: name or null, flags: Partial<FrictionFlags>, updatedAt }`. Store missing -> `configured:false, flags:{}` with 200. Store error/timeout (1500 ms) -> `configured:true, error:true, flags:{}` with 200. Never includes history. `export const dynamic = 'force-dynamic'`. |
| `/api/demo-controls/flags` | GET | header `x-demo-pin` | `no-store` | Full state: `{ configured, store, payload (flags, updatedAt, flagHistory), envDefaults, codeDefaults, effective }`. 401 on wrong/missing PIN, 503 `{error:'pin_not_configured'}` if `DEMO_CONTROLS_PIN` unset. |
| `/api/demo-controls/flags` | POST | header `x-demo-pin` | `no-store` | Body `{action:'toggle', flag, value}` or `{action:'all_on'|'all_off'|'only_fix_errors'}`. Validates body (400), reads payload, applies, sets `updatedAt` per changed flag, prepends one history entry, caps at 30, writes, returns new state. 401 wrong PIN, 503 `{error:'store_not_configured'}` when no store. Wrong PIN responses delayed ~500 ms. |
| `/api/hero-image` | GET | none | `no-store` | Waits ~3 s then returns a large (~1.5-2 MB) detailed SVG hero. Only referenced when `slowHero` is ON. |

## 6. Environment variables

| Var | Scope | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_CS_TAG_ID` | client | `506730812ef03` | Builds `https://t.contentsquare.net/uxa/${id}.js` |
| `NEXT_PUBLIC_CS_ENABLED` | client | `true` | `false` = no tag, no `_uxa` pushes (dataLayer still works) |
| `DEMO_CONTROLS_PIN` | server | unset (panel disabled) | PIN for panel and write API (6+ digits; user sets it in Vercel and `.env.local`; tests use `246810`) |
| `NEXT_PUBLIC_FRICTION_<FLAG>` | client, build-time | unset | `on`/`off` (also `true`/`false`, `1`/`0`). Names: `PROMO_FIELD`, `SHIPPING_SURPRISE`, `DECOY_BANNER`, `BURIED_CTA`, `DEAD_SWATCH`, `SILENT_SIZE`, `SLOW_HERO`, `POSTCODE_VALIDATION`, `EXPRESS_SHIPPING_ERROR`. Must be read with literal `process.env.NEXT_PUBLIC_FRICTION_PROMO_FIELD` etc. Changing requires redeploy (by design: it is the default layer). |
| `FLAG_STORE` | server | auto-detect | `upstash`, `memory`, `none`. Auto: Upstash vars present -> upstash; else none. `memory` must be set explicitly and is refused when `process.env.VERCEL` is set (local dev and Playwright only). |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) | server | unset | Upstash Redis REST, auto-injected by the Vercel Marketplace integration. Store key `tw:friction` (JSON `FlagStorePayload`), via `GET {url}/get/tw:friction` and `POST {url}/set/tw:friction` (raw JSON body) with `Authorization: Bearer {token}` |

No Vercel API token, Edge Config or team ID is needed. Edge Config was considered and rejected (Q1): writes would need an account-level Vercel API token, Hobby has a small size and write quota, and propagation adds delay.

Commit an `.env.example` with all vars (no secrets). `.env.local` is git-ignored.

## 7. Flag resolution and live behaviour

Priority (highest first), per flag:
1. URL override: `?friction=flagA:on,flagB:off` merges into sessionStorage key `tw-friction-overrides` (persists for the browser session). Special values: `?friction=all:on`, `?friction=all:off`, `?friction=reset` (clears overrides). Unknown keys/values ignored. The param stays in the URL (no rewrite).
2. Global store value (from `/api/flags`), only keys present in `payload.flags`.
3. `NEXT_PUBLIC_FRICTION_<FLAG>` env value.
4. `FRICTION` default in `lib/config.ts`.

Client mechanics (`FlagsProvider` in root layout):
- Server render and first client render use levels 3+4 only (avoids hydration mismatch). After mount: apply sessionStorage/URL overrides synchronously, then fetch `/api/flags` (`cache: 'no-store'` on the client; CDN cache applies). Re-fetch on route change if the last fetch is older than 30 s.
- Exposes `useFlag(key)`, `useFlags()`, `ready` (true once global fetch settled or 1500 ms timeout), and `profile`.
- Interaction-time flags (`deadSwatch`, `silentSize`, `postcodeValidation`, `expressShippingError`, `shippingSurprise`, `promoField`) read the current value at the time of use. A brief swap on first paint for `decoyBanner`/`slowHero`/`buriedCta` when the global value differs from env defaults is acceptable.
- Worst-case propagation for a new visitor: store latency (Upstash: immediate) + CDN `s-maxage=10` + `stale-while-revalidate=20` = well under 60 s.

`friction_profile` derivation (Q3; code defaults give `baseline`):
- `express_error` if `expressShippingError` is ON
- else `clean` if every flag is OFF
- else `fixed` if `postcodeValidation` is OFF
- else `baseline`

Master buttons: "All friction ON" (all 9 ON), "All friction OFF" (all 9 OFF), "Only fix errors" (`expressShippingError` and `postcodeValidation` OFF, the other 7 ON). Each is one store write and one history entry.

## 8. Tracking contract

- `ContentsquareTag` (client, in `app/layout.tsx`): unless `NEXT_PUBLIC_CS_ENABLED === 'false'` or pathname starts with `/demo-controls`, renders an inline `window._uxa = window._uxa || [];` and `<Script src=... strategy="afterInteractive" onLoad={...}>` setting `window.__csLoaded = true`.
- Initial page: no manual `trackPageview` (the tag sends the natural page view). Dynamic variables for the initial page are pushed to `_uxa` once flags are `ready` (queued if the tag has not loaded yet).
- Route change (pathname or search changes after first render): if `__csLoaded`, push `['trackPageview', pathname + search]`, then the dynamic variables. Not before the script has loaded.
- Dynamic variables (every page view): `friction_promo_field`, `friction_shipping_surprise`, `friction_decoy_banner`, `friction_buried_cta`, `friction_dead_swatch`, `friction_silent_size`, `friction_slow_hero`, `friction_postcode_validation`, `friction_express_error` (values `on`/`off`), and `friction_profile` (`baseline|express_error|fixed|clean`). Pushed as `['trackDynamicVariable', { key, value }]`.
- On `/confirmation` (once per order, guarded by `purchaseTracked`): `['trackDynamicVariable', { key: 'order_value', value: <total number, 2 dp> }]` plus dataLayer `purchase`.
- `window.dataLayer` (initialised `[]`), helper `track(event, data)` pushes `{ event, ...data }`. Ecommerce events use an `ecommerce` object (GA4-style):
  - `page_view`: `{ event, page_type, page_path, friction: { promoField: 'on', ... }, friction_profile }` on initial load (after `ready`) and every route change.
  - `view_item`: `{ ecommerce: { currency:'EUR', value, items:[item] } }` on PDP mount.
  - `add_to_cart` / `remove_from_cart`: `{ ecommerce: { currency, value, items:[{ item_id, item_name, item_category, item_variant: 'moss / M', price, quantity }] } }`. Quantity decrease to 0 / remove = `remove_from_cart`. Not fired when silentSize blocks the add.
  - `begin_checkout`: on `/checkout` mount with non-empty cart: `{ ecommerce: { currency, value, coupon, items } }`.
  - `purchase`: `{ ecommerce: { transaction_id, value, currency, shipping, discount, coupon, items } }`.
- `document.body.dataset.pageType` set by `PageTypeSync` on every route.
- No PII or card data in any push (email excluded too).

### Stable selectors (`data-testid`; ids where noted)

Header/footer: `nav-logo`, `nav-link-bags|apparel|accessories|all`, `header-cart-button`, `header-cart-count`. Home: `hero`, `hero-cta`, `hero-image`, `category-tile-<slug>`, `featured-row`, `values-strip`, `newsletter-email`, `newsletter-submit`, `newsletter-thanks`. PLP: `plp-title`, `plp-count`, `plp-sort`, `plp-grid`, `product-card-<slug>`, `plp-decoy-banner`. PDP: `pdp-gallery-main`, `pdp-thumb-<n>`, `pdp-name`, `pdp-price`, `pdp-swatch-<colour>`, `pdp-size-<size>`, `pdp-size-error`, `pdp-qty-dec`, `pdp-qty-value`, `pdp-qty-inc`, `add-to-cart` (id `add-to-cart`), `pdp-story`, `related-products`. Mini-cart: `mini-cart`, `mini-cart-close`, `mini-cart-view-cart`, `mini-cart-checkout`. Cart: `cart-line-<key>`, `cart-qty-dec`, `cart-qty-inc`, `cart-qty-value`, `cart-remove`, `cart-line-total`, `cart-subtotal`, `cart-discount`, `cart-shipping`, `cart-total`, `promo-code-toggle`, `promo-code-input` (id `promo-code`), `promo-code-apply`, `promo-code-message`, `proceed-to-checkout`, `cart-empty`. Checkout: `checkout-demo-banner`, `checkout-<field>` for email, firstName, lastName, address, city, postcode, country, cardNumber, cardExpiry, cardCvc; `error-<field>`; `shipping-standard`, `shipping-express`; `checkout-summary-shipping`, `checkout-summary-total`; `checkout-submit` (id `checkout-submit`); `checkout-processing`. Confirmation: `confirmation-order-number`, `confirmation-summary`, `confirmation-total`, `continue-shopping`. Panel: `pin-input`, `pin-submit`, `pin-error`, `store-status`, `flag-row-<flag>`, `flag-toggle-<flag>`, `flag-updated-<flag>`, `btn-all-on`, `btn-all-off`, `btn-only-fix-errors`, `flag-history`.

## 9. Acceptance criteria

### Global / shell
- `npm install && npm run dev` works; `npm run lint`, `npx tsc --noEmit`, `npm run build` pass with zero errors.
- Header: wordmark link to `/`, nav links to the 4 PLPs, cart button with live count (hidden or 0 until hydrated, no hydration warnings). Sticky or static per Designer. Mobile: nav collapses into an accessible menu (button with `aria-expanded`), or wraps, per Designer.
- Footer with brand, links (shop categories; non-functional info links acceptable as plain text or `#` with no 404), copyright.
- Skip link, landmarks (`header`, `nav`, `main`, `footer`), visible focus ring per tokens, WCAG AA contrast, touch targets >= 44 px.
- Unknown product/category slug -> 404 page styled in brand.
- Colours/type/spacing come from tokens in `docs/DESIGN_TOKENS.md`.

### Homepage `/`
- Hero with headline, subcopy, CTA (`hero-cta`) to `/category/all`, hero image.
- 3 category tiles to `/category/<slug>`; Featured/Bestsellers row with >= 4 ProductCards; brand values strip (3-4 items); newsletter: email field with label, submit shows thank-you state inline (no network), basic email validation message.

### PLP `/category/[slug]`
- Title (category name, "All products" for `all`) and count ("8 products"; `all` = 24).
- Grid of cards: image (default colour, front view), name, price (EUR formatted `€129` or `€129.00` consistently), colour count ("3 colours"); whole card links to PDP; responsive 2 cols mobile / 3-4 desktop.
- Sort select (labelled): Featured (default), Price low-high, Price high-low. Changing it updates `?sort=` via `router.replace` (no scroll jump) and order; loading a URL with `?sort=price-desc` renders that order. Invalid sort value falls back to Featured.
- No filters, no pagination.

### PDP `/product/[slug]`
- Gallery: main image + 3-4 thumbnails (buttons with alt/aria-label), clicking a thumbnail switches main view; images reflect selected colour.
- Name, price, stock label (low stock note, out of stock disables Add to cart with explanation).
- Colour swatches as radio group (keyboard arrows or tab+space), selected state visible, selected colour name shown.
- Size selector (apparel only) as radio group, no size preselected.
- Quantity stepper 1..10 (buttons disabled at bounds).
- Add to cart (`add-to-cart`): requires size for sized products (clean: inline error `pdp-size-error` "Please select a size", announced via `aria-live`, focus moves to size group); on success adds/merges line, header count updates, mini-cart drawer opens (focus moved into drawer, Esc and close button close it, focus returns), `add_to_cart` fires.
- Description, feature bullets, "You may also like" row (4 products, same category first, excluding current).

### Cart `/cart`
- Lines: image, name (link to PDP), variant (colour, size), quantity stepper (1..10; decrement at 1 is disabled, removal via Remove), remove button, line total.
- Summary: subtotal; discount line when promo applied ("DEMO10 (-10%)"); shipping line; total. Pricing (`lib/pricing.ts`): discount = 10% of subtotal, rounded to cents; free standard shipping when (subtotal - discount) >= 75, else 6.95; total = subtotal - discount + shipping.
- Promo: `DEMO10` (case-insensitive, trimmed) applies and shows success message; anything else shows error "This code isn't valid" in `promo-code-message` (`aria-live`), no discount. Remove-code option. Promo persists with the cart (localStorage) and carries into checkout.
- "Proceed to checkout" to `/checkout`. Empty state (`cart-empty`) with message and link to shop; checkout button not shown.
- Cart persists across reload and new tabs (localStorage).

### Checkout `/checkout`
- Demo banner (`checkout-demo-banner`) with exact text: "Demo store: no real payment is taken. Use any test details, e.g. 4242 4242 4242 4242."
- Empty cart -> message with link back to shop (no form).
- Sections: contact email; shipping address (first name, last name, address, city, postcode, country select: Netherlands default, Belgium, Germany, France); shipping method radio: Standard (Free or €6.95 per rule) / Express (€12.95); payment: card number, expiry (MM/YY), CVC.
- Order summary (lines, subtotal, discount, shipping per selected method, total) updates live.
- Clean validation on blur and submit: email format; required fields; postcode per country (NL `1234 AB` with or without space, any case; BE/DE/FR 4-5 digits) with helpful message "Enter a postcode like 1234 AB"; card number 13-19 digits after stripping spaces (no Luhn); expiry valid month and not in the past; CVC 3-4 digits. Errors inline (`error-<field>`, `aria-describedby`, `aria-invalid`), focus first invalid field on submit.
- Card inputs: `autocomplete="off"`, values never persisted, logged or tracked.
- Submit -> processing state (`checkout-processing`, button disabled, ~1.5 s) -> save Order to sessionStorage, clear cart (incl. promo), `router.push('/confirmation')`.

### Confirmation `/confirmation`
- Shows order number (`TW-` + 6 digits), thank-you message with email, order summary (lines, shipping method, totals), "Continue shopping" to `/`.
- Fires `purchase` + CS `order_value` exactly once per order (reload does not re-fire).
- No last order -> friendly "No recent order" state with link to shop.

### Friction flags (ON = deliberate behaviour, OFF = clean, nothing left behind)

| Flag | Capability | ON | OFF |
|---|---|---|---|
| `promoField` | Funnel | Cart summary shows a large, expanded, accent-highlighted promo block above the totals ("Have a promo code? Unlock extra savings") with input and Apply always visible | Small, collapsed "Add a promo code" disclosure (`promo-code-toggle`) below totals; expands to the same input. `DEMO10` works in both |
| `shippingSurprise` | Funnel | Cart shipping line reads "Calculated at checkout" and cart total excludes shipping when under threshold (over threshold shows "Free"). Checkout shows €6.95 | Cart shows the actual standard shipping (€6.95 or Free) and total including it, plus a "€X away from free shipping" hint when under threshold |
| `decoyBanner` | Heatmaps | Bright accent strip under PLP title (e.g. "Seasonal edit: new colours just landed →") styled like a link/CTA (arrow, hover colour) but is a non-interactive `div` (no link, no handler, not focusable) on every PLP | Strip not rendered at all |
| `buriedCta` | Heatmaps | On `BURIED_CTA_SLUG` only: purchase controls render after a long `pdp-story` block (story paragraphs, specs, care, ~2-3 mobile screens) so Add to cart is far below the fold on mobile | Standard PDP layout: Add to cart directly under selectors, story block absent or below the CTA |
| `deadSwatch` | Replay | On `DEAD_SWATCH.slug`, swatch `DEAD_SWATCH.colour` looks and hovers like the others but clicking/keyboard selecting does nothing (no state change, no image change, no error) | Swatch works like all others |
| `silentSize` | Replay | On `SILENT_SIZE_SLUG` only: Add to cart with no size selected does nothing (no message, no drawer, no event). Other sized products still show the clean error | Clean inline size error as on every product |
| `slowHero` | Replay | Homepage hero image is `<img src="/api/hero-image">` (~3 s delay, ~1.5-2 MB SVG); space is reserved (no layout shift beyond the visual pop-in) | Hero uses lightweight `/images/hero.svg`, loads instantly; `/api/hero-image` not requested |
| `postcodeValidation` | Errors | Postcode accepted only if it matches `^\d{4}[A-Z]{2}$` or `^\d{4,5}$` (so `1234 AB`, `1234ab` are rejected on first try); error text is "Invalid input." with no format hint | Clean, normalising per-country validation with helpful message |
| `expressShippingError` | Errors | When Express is selected while the postcode matches `EXPRESS_ERROR_POSTCODE` (or the postcode is changed to match while Express is selected), the handler throws an uncaught `TypeError` (e.g. reading `rate` of an undefined zone) from an event handler (not render, so the page does not crash); summary keeps the previous shipping value; Pay button stays enabled-looking but clicking it does nothing except throw again. Switching to Standard clears the broken state and Pay works | Express works (€12.95) for every postcode; no errors in console |

General flag criteria: each flag is read only through the resolver; `?friction=<flag>:on|off` flips it for the browser session; with every flag OFF the store looks complete and polished; ON states look subtle and realistic (Designer sign-off).

### Control panel `/demo-controls`
- Not linked anywhere; `robots` noindex/nofollow meta; disallowed in `robots.txt`; no CS tag request on this route.
- PIN gate: PIN input (masked, labelled); submit calls GET `/api/demo-controls/flags` with `x-demo-pin`; 401 -> `pin-error` "Wrong PIN"; success stores PIN in sessionStorage (cleared on "Lock"). If PIN env missing: message "Control panel disabled: set DEMO_CONTROLS_PIN".
- Store status (`store-status`): store name and "connected", or warning "Global store not configured: toggles disabled. Visitors use env defaults and ?friction= overrides." Switches disabled in that state.
- One row per flag: label, one-line description, capability badge (Funnel / Heatmaps / Session replay / Errors), ON/OFF switch (`role="switch"`, `aria-checked`), effective value and its source (global / env / default), last changed time (`flag-updated-<flag>`, local time, or "never").
- Master buttons `btn-all-on`, `btn-all-off`, `btn-only-fix-errors`.
- History (`flag-history`): last 20 entries, newest first, timestamp (local + ISO on hover/title), action, changed flags with from -> to.
- Current `friction_profile` shown. Changes reflect immediately in the panel (uses no-store responses). Errors from the API shown inline, never crash.
- API rejects wrong/missing PIN with 401 for GET and POST, malformed body with 400.

### Tracking
- CS script requested once from `https://t.contentsquare.net/uxa/<NEXT_PUBLIC_CS_TAG_ID>.js` on shop pages; not requested when `NEXT_PUBLIC_CS_ENABLED=false` or on `/demo-controls`.
- Route change pushes `trackPageview` with `pathname + search`; initial load does not double-count.
- Dynamic variables pushed on every page view with correct values for the effective flags; `order_value` once on confirmation.
- dataLayer events and payloads exactly as in section 8; `data-page-type` correct on every route.
- All selectors in section 8 present.

### Live toggles
- With a store configured (memory store locally), toggling `expressShippingError` in the panel changes the behaviour for a new browser context (no overrides) within 60 s (locally: immediately on next page load). `/api/flags` returns `s-maxage <= 10` and `stale-while-revalidate <= 20`.
- OFF removes the error completely (no console error, Pay works with Express + matching postcode).
- URL override beats global value; global beats env; env beats code default (unit/E2E proof).
- Store unconfigured or failing: shop works using env/code defaults, `/api/flags` returns 200, panel shows the warning.
- `flagHistory` records each change with timestamp, capped at 30.

## 10. Per-milestone tasks

### M1 Foundation and brand
- Designer (first): write `docs/DESIGN_TOKENS.md`: palette (neutrals + one accent, contrast ratios), type scale and font choice (must build without network access: system stack or `next/font/local`; avoid `next/font/google`), spacing, radii, shadows, breakpoints, focus ring, button/input/card/badge patterns, SVG illustration style and how colour variants apply, wordmark treatment, brand name/tagline confirmation.
- Builder: `create-next-app@latest` in repo root (TS, Tailwind, ESLint, App Router, no src, alias `@/*`); ensure `npm run lint` uses ESLint CLI (Next 16 has no `next lint`); tokens into `globals.css` `@theme`; `.env.example`, `.gitignore`; route structure and `(shop)` group with placeholder pages for every route incl. `/demo-controls` (noindex); Header (wordmark, nav, cart icon showing 0), Footer, skip link, 404; `lib/products.ts` with 24 products; `ProductImage` SVG renderer with silhouettes, colour variants, 4 views; `lib/config.ts` with constants, `FlagKey`, `FRICTION`, `FLAG_META` (no behaviour yet); `lib/format.ts`; `types/global.d.ts`.
- Designer (review): tokens applied, shell, imagery quality across all 24 products.
- Tester: install `@playwright/test`, `playwright.config.ts` (webServer `npm run build && npm run start`, port 3000, desktop 1280x800 + mobile iPhone 13; env `FLAG_STORE=memory`, `DEMO_CONTROLS_PIN=246810`; route `t.contentsquare.net` stubbed in a shared fixture), `test:e2e` script; smoke test all routes 200 (bad slugs 404), screenshots.
- Documenter: create `PROJECT_STATUS.md`, `ARCHITECTURE.md`, `DECISIONS.md` (include answers to planner questions), skeletons for other docs marked "planned (milestone N)", update `README.md`/`CLAUDE.md`.

### M2 Catalogue and cart store
- Builder: Homepage sections; PLP with sort (client, `?sort=`); PDP (gallery, swatches, sizes, qty, purchase panel, related); `CartProvider` (reducer, localStorage `tw-cart-v1`, hydration-safe), header count, MiniCartDrawer; `lib/pricing.ts`.
- Designer: review home/PLP/PDP/drawer desktop + 390 px, keyboard flow, focus management in drawer.
- Tester: home -> PLP -> PDP -> add to cart; sort; variant selection; qty; size error (clean); header count; drawer; persistence on reload; screenshots.
- Documenter: FEATURES (home, PLP, PDP, cart store), ARCHITECTURE (state), STATUS.

### M3 Cart, checkout, confirmation
- Builder: cart page, promo, shipping/totals (clean behaviour), checkout form + validation (clean), shipping methods, processing, order save, cart clear, confirmation view, no-order state.
- Designer: forms (labels, errors, autocomplete attrs except card), banner, summary hierarchy, trust cues, mobile checkout.
- Tester: full purchase flow; qty change/remove; empty cart; `DEMO10` valid/invalid; threshold (under and over 75, incl. discount crossing threshold); checkout validation per field; confirmation; cart cleared; reload confirmation.
- Documenter: FEATURES (cart, promo, shipping rules, checkout, confirmation), STATUS.

### M4 Friction flags (local)
- Builder: `lib/flags/env.ts`, `overrides.ts`, `resolve.ts` (pure, with profile), `FlagsProvider` + hooks (global level wired to a stub returning `{}` until M6, but fetching `/api/flags` if it exists is fine); implement all 9 behaviours exactly per section 9; `/api/hero-image`; `public/images/hero.svg`.
- Designer: each ON state subtle/realistic; each OFF state clean; no a11y regressions in OFF state.
- Tester: each flag ON and OFF via `?friction=`; `all:on`, `all:off`, `reset`; sessionStorage persistence across navigation; env/default priority (unit test of `resolve.ts` via Playwright test or a tiny node test); console error present only for expressShippingError ON.
- Documenter: FRICTION_FLAGS (each flag, capability, how it shows in Contentsquare, resolution order, env vars), DECISIONS for postcode/product choices.

### M5 Tracking
- Builder: `ContentsquareTag`, `RouteTracker`, `PageTypeSync`, `lib/tracking/*`; all dataLayer events; dynamic variables incl. friction state and `order_value`; audit all `data-testid`s from section 8.
- Designer: quick check that no visual regressions (light review; may approve with no findings).
- Tester: script request (stubbed), not on `/demo-controls`, not when disabled (separate build or documented manual check), `_uxa` pushes on route change, dynamic vars values for several flag states, dataLayer payloads for every event, purchase once, `data-page-type`, selector presence.
- Documenter: TRACKING.md complete with payload examples.

### M6 Live toggles and control panel
- Builder: `lib/flags/store/*` (`upstash.ts` + `memory.ts`), `getStore()` autodetect, `/api/flags`, `/api/demo-controls/flags` (GET/POST, PIN, history), `lib/flags/pin.ts`, panel UI, profile display, fallback states, `robots.ts`.
- Designer: panel clarity and usability during a live demo (big readable switches, clear state, mobile usable), noindex check.
- Tester: wrong/missing PIN (panel + API GET/POST) rejected; PIN-not-configured state; toggles and master buttons update panel, `updatedAt`, history (cap 30, show 20); new browser context sees `expressShippingError` change; OFF removes error; cache headers; override > global > env; store-unconfigured fallback (run with `FLAG_STORE=none`).
- Documenter: FRICTION_FLAGS (panel, phases), DEPLOYMENT (store setup, token/PIN, env vars), DECISIONS.

### M7 Hardening, polish, handover
- Builder: fix backlog; optional `scripts/traffic/` headed Playwright persona script (manual use only, not run in CI) if time allows; final lint/build.
- Designer: full-site final review both flag states, desktop + mobile; final approval.
- Tester: full regression across all specs both viewports; final `TEST_REPORT.md`.
- Documenter: finish DEMO_SCRIPT, TRAFFIC_GUIDE (from brief unless user supplied content), DEPLOYMENT incl. Contentsquare domain allow-listing reminder, README, CLAUDE.md, STATUS with manual steps for the user.

## 11. Ready-to-paste prompts

Shared prefix for every prompt (orchestrator prepends): "You are acting as the `<agent>` agent. First read your role definition at `.claude/agents/<agent>.md` and follow it exactly (ignore its frontmatter). Project root: `/Users/bertblommestein/Coding Projects/ContentSquare-Demo`."

### M1
- **designer (tokens, run first):** "Milestone M1 (docs/PLAN.md sections 1, 2, 10-M1). Before any code exists, write `docs/DESIGN_TOKENS.md`: palette with contrast ratios, type scale and a font choice that builds offline, spacing, radii, shadows, breakpoints, focus ring, patterns for buttons, inputs, cards, badges, switches, the drawer and the SVG product illustration style incl. how colour variants and the 4 views work. Confirm or refine the brand name/tagline proposal (Tidewild, 'Made for the long way round.'). Also give guidance for the subtle look of the friction ON states listed in PLAN section 9. Return the file path and any decisions the Builder must follow."
- **builder:** "Build milestone M1 per docs/PLAN.md section 10-M1, using structure (3), data model (4: full 24-product catalog with the listed slugs and friction targets; `lib/config.ts` with all constants, `FlagKey`, `FRICTION` defaults = all true except `expressShippingError: false`, and `FLAG_META` incl. env var and dynamic variable names), routes (5), env vars (6: write `.env.example` with `NEXT_PUBLIC_CS_TAG_ID`, `NEXT_PUBLIC_CS_ENABLED`, `DEMO_CONTROLS_PIN`, `FLAG_STORE`, the Upstash vars and the 9 `NEXT_PUBLIC_FRICTION_*`) and selectors (8) for the shell. Follow docs/DESIGN_TOKENS.md and docs/DECISIONS.md. Scaffold with `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias '@/*' --use-npm` (the repo already contains docs/, .claude/ and CLAUDE.md: keep them; if the CLI refuses a non-empty dir, scaffold in a temp dir and move the files in). Placeholder pages are fine for routes built later, but every route (incl. `/category/all`, all product slugs via generateStaticParams with `dynamicParams = false`, and a noindex `/demo-controls` outside the shop layout) must render in the correct layout. No friction behaviour, tracking or flag store yet. Acceptance: PLAN section 9 'Global / shell'; `npm run lint`, `npx tsc --noEmit`, `npm run build` pass."
- **designer (review):** "Review milestone M1 against docs/PLAN.md section 9 'Global / shell' and your tokens. Focus on token usage, header/footer, mobile nav, focus states and the quality/consistency of the SVG product imagery for all 24 products and their colour variants."
- **tester:** "Test milestone M1 per docs/PLAN.md section 10-M1: set up Playwright as described, smoke test every route (valid slugs 200, invalid 404), check header/footer/skip link, screenshot every route desktop + mobile."
- **documenter:** "Update docs after milestone M1 per docs/PLAN.md section 10-M1. Create DECISIONS.md with the planner question answers from the orchestrator (or note pending), PROJECT_STATUS.md, ARCHITECTURE.md, and skeletons for the other docs."

### M2
- **builder:** "Build milestone M2 per docs/PLAN.md section 10-M2. Acceptance: section 9 Homepage, PLP, PDP, plus cart persistence and header count. Use pricing rules from section 9 Cart in `lib/pricing.ts`. Do not implement friction behaviour yet; leave clean behaviour."
- **designer:** "Review milestone M2 (home, PLP, PDP, mini-cart drawer) against docs/PLAN.md section 9 and DESIGN_TOKENS.md, desktop and 390 px, including keyboard flow and drawer focus management."
- **tester:** "Test milestone M2 per docs/PLAN.md section 10-M2 and acceptance criteria in section 9 (Homepage, PLP, PDP). Include sort via UI and via `?sort=` URL, variant/size/qty, add to cart, drawer, header count, persistence on reload."
- **documenter:** "Update docs after milestone M2 per docs/PLAN.md section 10-M2."

### M3
- **builder:** "Build milestone M3 per docs/PLAN.md section 10-M3. Acceptance: section 9 Cart, Checkout, Confirmation (clean behaviour only; friction comes in M4). No real card handling."
- **designer:** "Review milestone M3 (cart, checkout, confirmation) against docs/PLAN.md section 9: form labels, error messaging, banner visibility, summary hierarchy, trust and mobile checkout."
- **tester:** "Test milestone M3 per docs/PLAN.md section 10-M3: full purchase flow, qty/remove, empty cart, DEMO10 valid/invalid, shipping threshold incl. discount crossing 75, every checkout validation rule, confirmation, cart cleared, purchase reload behaviour."
- **documenter:** "Update docs after milestone M3 per docs/PLAN.md section 10-M3."

### M4
- **builder:** "Build milestone M4 per docs/PLAN.md section 10-M4 and section 7 (resolution order, override syntax). Implement all 9 friction flags exactly per the table in section 9 'Friction flags', each read only via the resolver; OFF must leave no trace."
- **designer:** "Review milestone M4: check every friction flag ON (subtle, realistic, not to be removed) and OFF (clean and polished) per docs/PLAN.md section 9. Use `?friction=all:on` / `all:off` and per-flag overrides."
- **tester:** "Test milestone M4 per docs/PLAN.md section 10-M4: every flag ON and OFF via `?friction=`, special values, session persistence, priority order, console errors only from expressShippingError ON. Deliberate friction is not a bug."
- **documenter:** "Update docs after milestone M4 per docs/PLAN.md section 10-M4 (FRICTION_FLAGS.md is the main deliverable)."

### M5
- **builder:** "Build milestone M5 per docs/PLAN.md section 8 (tracking contract and selectors) and section 10-M5. Acceptance: section 9 'Tracking'."
- **designer:** "Light review of milestone M5: confirm no visual or a11y regressions from tracking/selector changes."
- **tester:** "Test milestone M5 per docs/PLAN.md section 10-M5 and section 8: CS script (stubbed), virtual page views, dynamic variables for different flag states, every dataLayer event payload, purchase once, data-page-type, selectors, no tag on /demo-controls."
- **documenter:** "Update docs after milestone M5: complete TRACKING.md with payload examples per docs/PLAN.md section 8."

### M6
- **builder:** "Build milestone M6 per docs/PLAN.md sections 5 (API routes), 6 (env vars), 7 (live behaviour) and 10-M6, using Upstash Redis via REST `fetch` (no SDK) plus the memory store for local/testing; no Edge Config. Acceptance: section 9 'Control panel' and 'Live toggles'."
- **designer:** "Review milestone M6: the /demo-controls panel for live-demo usability (readability, clear state, switch semantics, master buttons, history) on desktop and mobile, per docs/PLAN.md section 9 'Control panel'."
- **tester:** "Test milestone M6 per docs/PLAN.md section 10-M6 and section 9 'Control panel' and 'Live toggles', using `FLAG_STORE=memory` and also `FLAG_STORE=none` for fallback. State clearly what could only be verified against a real Vercel store after deploy."
- **documenter:** "Update docs after milestone M6: FRICTION_FLAGS.md (panel, resolution order, phase workflow) and DEPLOYMENT.md (store setup, PIN/token, env vars) per docs/PLAN.md sections 6, 7, 10-M6."

### M7
- **builder:** "Milestone M7 per docs/PLAN.md section 10-M7: fix the open items listed below [orchestrator pastes backlog], optional traffic script, final lint/type/build."
- **designer:** "Final review M7: whole site, all flags ON and all OFF, desktop and 390 px, against docs/PLAN.md section 9. Approve or list must-fix items."
- **tester:** "Final regression M7: run every spec on both viewports, all acceptance criteria in docs/PLAN.md section 9; produce the final TEST_REPORT.md."
- **documenter:** "Final docs M7 per docs/PLAN.md section 10-M7: DEMO_SCRIPT, TRAFFIC_GUIDE, DEPLOYMENT (incl. Contentsquare domain allow-listing), README, CLAUDE.md, PROJECT_STATUS with the user's manual steps."

## 12. Decisions (answered 2026-10-14, all recommended defaults; details in docs/DECISIONS.md)

1. **Flag store:** Upstash Redis via Vercel Marketplace. Edge Config rejected (account-level API token, write quota, propagation delay).
2. **PIN/token:** user sets `DEMO_CONTROLS_PIN` (6+ digits) in Vercel and `.env.local`; no Vercel API token. The user creates the Upstash store after the build; during the build all live-toggle tests use `FLAG_STORE=memory`. Verification against the real store is a post-deploy manual step.
3. **Defaults/phases:** all flags ON except `expressShippingError` OFF. Profiles: `express_error` / `clean` / `fixed` / `baseline` as in section 7. Phase A = defaults (baseline), B = turn express error ON, C = "Only fix errors" (fixed).
4. **Geography:** countries NL (default), BE, DE, FR; express error trigger `/^10/`; strict postcode mode as in section 9.
5. **Cookie consent:** no banner; TRAFFIC_GUIDE notes configuring Contentsquare privacy settings accordingly.

## 13. Change log
- 2026-10-14: initial plan (no user answers yet; Q1-Q5 provisional).
- 2026-10-14: finalized with the user's answers (all defaults). Removed provisional markers; removed Edge Config / `VERCEL_API_TOKEN` / `VERCEL_TEAM_ID` paths (Upstash + memory only); section 12 turned into decisions; M1 builder prompt made self-contained.
- 2026-10-14 (M1): section 4 `Silhouette` adds `daypack` (daypack-18) and `zip-wallet` (travel-wallet) after Designer review, so all 24 products have distinct drawings.
