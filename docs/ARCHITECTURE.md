# Architecture

Status: reflects the code after M2 (M3 is being built; its files are not documented yet). Planned parts are marked with their milestone. Full target structure: `docs/PLAN.md` section 3.

## Stack

- Next.js 16.4 App Router, React 19.3, TypeScript strict, Tailwind CSS v4 (via `@tailwindcss/turbopack`). No UI libraries.
- `next.config.ts`: `cacheComponents` and `partialPrefetching` are off (route segment config is needed); `turbopack.root` is pinned to the repo.
- Read `AGENTS.md` before writing Next.js code: this Next version differs from older docs. The guides are in `node_modules/next/dist/docs/`.

## Folder structure (current)

```
app/
  layout.tsx            # <html lang="en-GB">, globals.css, SkipLink, default metadata
  globals.css           # Tailwind v4 import + @theme tokens (DESIGN_TOKENS.md)
  icon.svg              # favicon (tide glyph)
  not-found.tsx         # branded 404 with shop chrome
  (shop)/               # route group, no URL segment
    layout.tsx          # CartProvider > ShopShell + MiniCartDrawer (RouteTracker: M5)
    page.tsx            # /  Hero, CategoryTiles, FeaturedRow, ValuesStrip, NewsletterSignup
    category/[slug]/    # /category/bags|apparel|accessories|all, static, dynamicParams=false; PlpListing in Suspense
    product/[slug]/     # /product/<slug>, static, dynamicParams=false; ProductDetail + story + RelatedProducts
    cart/ checkout/ confirmation/   # "coming soon" placeholders (M3)
  demo-controls/        # layout: robots noindex,nofollow, minimal chrome; page placeholder (M6)
components/
  home/     Hero, CategoryTiles, FeaturedRow, ValuesStrip, NewsletterSignup (client)
  layout/   Header (client), Footer, Wordmark, CartButton (client), MiniCartDrawer (client), SkipLink, ShopShell, PagePlaceholder, nav.ts
  product/  ProductCard, ProductGrid, PlpListing + SortSelect (client), PurchasePanel (exports ProductDetail),
            ProductGallery, ColourSwatches, SizeSelector, QuantityStepper, RelatedProducts;
            svg/ProductImage (renderer), silhouettes.tsx (SILHOUETTES map), color.ts (palette)
  ui/       Button (+ ButtonLink, buttonClasses), Field (inputClasses, labelClasses, FieldError), Select, Price, icons
lib/
  config.ts    # shop constants, friction targets, COUNTRIES, FlagKey, FRICTION defaults, FLAG_META, FLAG_KEYS
  products.ts  # types, CATEGORIES, PRODUCTS (24), getCategory/getByCategory/getBySlug/getById/getFeatured/getRelated/sortProducts/parseSort
  format.ts    # formatPrice (Intl EUR), pluralise
  pricing.ts   # pure pricing: roundCents, lineTotal, subtotal, isValidPromo, discount, shipping, awayFromFreeShipping, totals
  cart/store.ts         # external cart store: reducer, localStorage tw-cart-v1, subscribe/getSnapshot/dispatch
  cart/CartProvider.tsx # CartProvider (drawer UI state), useCart(), useCartUi()
public/images/hero.svg  # homepage hero art
types/global.d.ts  # window._uxa, window.__csLoaded, window.dataLayer
tests/             # Playwright: fixtures.ts, smoke, shell, catalogue (M2), screenshots specs
playwright.config.ts
```

Not built yet (as of M2): `app/robots.ts`, `app/api/*`, `components/{cart,checkout,confirmation,demo-controls,tracking}`, `lib/order.ts`, `lib/checkout`, `lib/flags`, `lib/tracking`.

## Key components

- **ShopShell** (`components/layout/ShopShell.tsx`): Header, `main#main[tabindex=-1]` (skip-link target), Footer. Used by `(shop)/layout.tsx`. `/demo-controls` has its own layout without shop chrome.
- **Header** (client): sticky bar with wordmark, desktop nav (`nav-link-<slug>`, `aria-current`), mobile menu (`mobile-menu-button`, `mobile-nav-link-<slug>`; Esc closes and returns focus, closes on route change), `CartButton`.
- **CartButton**: a link to `/cart` (it never opens the drawer); reads `useCart().count`, shown only after hydration and hidden at 0; accessible name "Cart, empty" / "Cart, N items".
- **ProductDetail** (`components/product/PurchasePanel.tsx`, client): owns PDP state (colour, view, size, qty, size error); renders `ProductGallery` and the purchase controls; on Add to cart calls `useCart().addItem` then `useCartUi().openDrawer("added", addButton)`.
- **PlpListing** (client): reads `?sort=` with `useSearchParams`, sorts with `sortProducts`, writes the choice with `router.replace(..., { scroll: false })`. Wrapped in `Suspense` with `PlpListingFallback` (featured order, select disabled) so the static HTML is complete.
- **MiniCartDrawer** (client): rendered only while `drawerOpen`; manages focus (to Close on open, Tab trap, return to the opener on close), Esc, body scroll lock.
- **ProductImage** (`components/product/svg/ProductImage.tsx`): renders `product.silhouette` for a colour and view (`front|back|side|detail`) from `SILHOUETTES`; `color.ts` derives shade/highlight/outline from the colour hex. One silhouette per product (24 total).

## State and data flow

- Catalogue: static data in `lib/products.ts`; PLP/PDP pages are statically generated with `generateStaticParams` and unknown slugs 404.
- Cart (M2): see below. Last order (M3): sessionStorage `tw-last-order`.
- Friction flags (M4/M6): one resolver, priority URL override > global store (`/api/flags`) > `NEXT_PUBLIC_FRICTION_*` env > `FRICTION` in `lib/config.ts`. Only the defaults and metadata exist today. See `docs/PLAN.md` section 7.
- Tracking (M5): Contentsquare tag, virtual page views, dynamic variables, `window.dataLayer`. See `docs/PLAN.md` section 8.

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

## Testing

- `npm run test:e2e`: the Playwright `webServer` runs `npm run build && npm run start -p 3000` with `FLAG_STORE=memory` and `DEMO_CONTROLS_PIN=246810`. `tests/fixtures.ts` stubs `t.contentsquare.net` and records the requests.
- The build rewrites `.next/`. Do not run a second `next start` from this folder while tests run.
