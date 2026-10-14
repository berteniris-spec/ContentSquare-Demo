# Features

Status: reflects the code after M2. Each section is filled in when its milestone ships. Spec: `docs/PLAN.md` sections 5 and 9. All behaviour below is the clean (no-friction) behaviour; friction comes in M4.

## Shell (M1)

- Header (wordmark, nav to 4 PLPs, mobile menu, cart link to `/cart` with live item count), footer, skip link, branded 404. Code: `components/layout/`.
- Header cart (`components/layout/CartButton.tsx`) is always a link to `/cart` and never opens the drawer. Count badge (`header-cart-count`) is hidden at 0 and before hydration; accessible name "Cart, empty" / "Cart, 1 item" / "Cart, N items".

## Catalogue data (M1)

- 24 products, 3 categories + `all`, helpers for category, slug, featured, related, sort. Code: `lib/products.ts`.
- SVG product imagery: 24 silhouettes, colour variants, 4 views. Code: `components/product/svg/`.

## Homepage `/` (M2)

Page: `app/(shop)/page.tsx`. Sections, in order (`components/home/`):

| Section | Component | Behaviour |
|---|---|---|
| Hero | `Hero.tsx` | H1 "Gear for days that run long.", subcopy, CTA `hero-cta` "Shop all products" -> `/category/all`, art `public/images/hero.svg` (`hero-image`). |
| Category tiles | `CategoryTiles.tsx` | 3 tiles `category-tile-<slug>` -> `/category/<slug>`. Art: Roll-top pack (Bags), Canvas overshirt (Apparel), Wool beanie (Accessories). Label chip on a surface, never text on art. Tile ratio 4:3 on mobile, 4:5 from `sm`, 3:4 from `md`. |
| Featured | `FeaturedRow.tsx` | `featured-row`: first 4 of `getFeatured()` as `ProductCard`s, plus a "View all" link to `/category/all`. |
| Values strip | `ValuesStrip.tsx` | `values-strip`: 3 items (free shipping over €75, better materials, repairs at cost). |
| Newsletter | `NewsletterSignup.tsx` | Labelled email field (`newsletter-email`), `newsletter-submit`. Empty -> "Enter your email address"; invalid -> "Enter an email address like name@example.com" (`role=alert`, `aria-invalid`); valid -> inline `newsletter-thanks` (`role=status`). No network request. 2-column layout from `md`. |

## PLP `/category/[slug]` (M2)

- Page: `app/(shop)/category/[slug]/page.tsx` (static, `dynamicParams = false`, unknown slug -> 404). Title `plp-title` and count `plp-count` ("8 products", `all` = 24).
- Grid `plp-grid` of `ProductCard` (`components/product/ProductCard.tsx`, `ProductGrid.tsx`): image, name, price, colour count, stock badge; whole card links to the PDP. 2 / 3 / 4 columns.
- Sort (`components/product/PlpListing.tsx`, `SortSelect.tsx`): labelled "Sort by" select `plp-sort` with Featured (default), Price: low to high, Price: high to low.
  - Reads `?sort=` via `useSearchParams`; `parseSort` falls back to Featured for missing or invalid values (e.g. `?sort=banana`).
  - Changing it calls `router.replace(..., { scroll: false })`: no history entry, no scroll jump. Picking Featured explicitly writes `?sort=featured`.
  - A static fallback in featured order (select disabled) renders inside `Suspense` until search params are known.

## PDP `/product/[slug]` (M2)

Page: `app/(shop)/product/[slug]/page.tsx` (static, unknown slug -> 404). Main component `ProductDetail` in `components/product/PurchasePanel.tsx`.

- **Gallery** (`ProductGallery.tsx`): main image `pdp-gallery-main` (4:5) plus one thumbnail button per view (`pdp-thumb-<n>`, 80x100 px `h-25 w-20`, `aria-label` "Show <view> view", `aria-pressed`). Images follow the selected colour. From `lg` the thumbnails form a vertical rail left of the main image (DOM order unchanged); below `lg` they sit in a row underneath.
- **Name, price, stock**: `pdp-name`, `pdp-price`. Low stock shows a pill plus "Only a few left". Sold out (`out_of_stock`, e.g. `trail-shorts`) disables Add to cart, relabels it "Sold out" and adds an explanation linked via `aria-describedby`.
- **Colour swatches** (`ColourSwatches.tsx`): radiogroup "Colour" with roving tabindex; arrow keys move focus and selection; selected colour name shown.
- **Sizes** (`SizeSelector.tsx`, sized products only): radiogroup, nothing preselected.
- **Quantity** (`QuantityStepper.tsx`): 1..10, minus disabled at 1, plus disabled at 10.
- **Add to cart** (`add-to-cart`, id `add-to-cart`): for a sized product with no size, shows "Please select a size" (`role=alert`), moves focus to the first size and adds nothing; selecting a size clears the error. On success it adds or merges the line and opens the mini-cart drawer with "Added to cart".
- **Description and feature bullets**, then the long story `pdp-story` below the CTA (clean layout; `buriedCta` moves it in M4).
- **Related** (`RelatedProducts.tsx`): "You may also like", 4 products from `getRelated` (same category, excluding current).

## Cart store (M2)

Code: `lib/cart/store.ts`, `lib/cart/CartProvider.tsx`. Details in `ARCHITECTURE.md` (State).

- Line key `<productId>:<colour>:<size or ->` (e.g. `p02:sand:-`). Adding the same variant merges quantities; a different colour or size is a new line. Quantity is clamped to 1..10 (`MAX_QTY`), also on merge.
- Actions: `addItem`, `setQuantity`, `removeItem`, `applyPromo`, `removePromo`, `clear` (the last four are used from M3).
- Persisted in localStorage `tw-cart-v1` (items + `promoCode`). Survives reload, navigation and other tabs (`storage` event). Corrupt or invalid storage falls back to an empty cart without errors.

## Mini-cart drawer (M2)

Code: `components/layout/MiniCartDrawer.tsx`, mounted once in `app/(shop)/layout.tsx`.

- Opened only by Add to cart (title "Added to cart"). `role=dialog`, `aria-modal`, `mini-cart`; right panel `max-w-md` on desktop, full width on mobile; scrim `bg-ink/40`; body scroll locked; slide-in animation under `motion-safe:`.
- Lines: image tile, name, "Colour / Size", "qty × price". Footer: subtotal, note "Free standard shipping over €75", `mini-cart-view-cart` (-> `/cart`) and `mini-cart-checkout` (-> `/checkout`).
- Focus: moves to `mini-cart-close` on open; Tab and Shift+Tab are trapped; Esc, the close button or a backdrop click closes it; focus returns to Add to cart. Any route change closes it, and it does not reopen on Back.

## Pricing rules (M2, used from M3)

Pure functions in `lib/pricing.ts`, constants in `lib/config.ts`. Amounts in EUR, rounded to cents (`roundCents`).

- `lineTotal`, `subtotal`.
- `isValidPromo(code)`: `DEMO10`, trimmed, case-insensitive. `discount(sub, code)`: 10% of the subtotal.
- `shipping(discountedSubtotal, method)`: standard is free when subtotal - discount >= €75, else €6.95; express is always €12.95.
- `awayFromFreeShipping(discountedSubtotal)`: amount still needed for free standard shipping.
- `totals(lines, promo, method)`: `{ subtotal, discount, shipping, total }`; shipping is 0 for an empty cart.
- In M2 only the subtotal is shown (drawer). The cart page and checkout that use the rest are M3.

## Planned

- Cart page, promo `DEMO10` UI, shipping rule display: planned (milestone 3)
- Checkout (single page, validation, processing state) and confirmation: planned (milestone 3)
- Friction behaviours: planned (milestone 4), see `FRICTION_FLAGS.md`
- Tracking events (incl. `add_to_cart`): planned (milestone 5), see `TRACKING.md`
- Control panel `/demo-controls`: planned (milestone 6)
