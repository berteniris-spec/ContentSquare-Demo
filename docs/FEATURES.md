# Features

Status: reflects the code after M4. Each section is filled in when its milestone ships. Spec: `docs/PLAN.md` sections 5 and 9. Sections describe the clean behaviour (flags OFF); the friction variants are in "Friction behaviours (M4)" below and in `FRICTION_FLAGS.md`. Note: with code defaults 8 flags are ON, so a fresh visit shows friction.

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
- **Description and feature bullets**, then the story `pdp-story` (`ProductStory.tsx`) below the CTA (clean layout; `buriedCta` moves a long version above it on the Trailhead 28).
- **Related** (`RelatedProducts.tsx`): "You may also like", 4 products from `getRelated` (same category, excluding current).

## Cart store (M2)

Code: `lib/cart/store.ts`, `lib/cart/CartProvider.tsx`. Details in `ARCHITECTURE.md` (State).

- Line key `<productId>:<colour>:<size or ->` (e.g. `p02:sand:-`). Adding the same variant merges quantities; a different colour or size is a new line. Quantity is clamped to 1..10 (`MAX_QTY`), also on merge.
- Actions: `addItem`, `setQuantity`, `removeItem`, `applyPromo`, `removePromo`, `clear` (cart page, promo and checkout use them from M3).
- Persisted in localStorage `tw-cart-v1` (items + `promoCode`). Survives reload, navigation and other tabs (`storage` event). Corrupt or invalid storage falls back to an empty cart without errors.

## Mini-cart drawer (M2)

Code: `components/layout/MiniCartDrawer.tsx`, mounted once in `app/(shop)/layout.tsx`.

- Opened only by Add to cart (title "Added to cart"). `role=dialog`, `aria-modal`, `mini-cart`; right panel `max-w-md` on desktop, full width on mobile; scrim `bg-ink/40`; body scroll locked; slide-in animation under `motion-safe:`.
- Lines: image tile, name, "Colour / Size", "qty × price". Footer: subtotal, note "Free standard shipping over €75", `mini-cart-view-cart` (-> `/cart`) and `mini-cart-checkout` (-> `/checkout`).
- Focus: moves to `mini-cart-close` on open; Tab and Shift+Tab are trapped; Esc, the close button or a backdrop click closes it; focus returns to Add to cart. Any route change closes it, and it does not reopen on Back.

## Pricing rules (M2, used from M3)

Pure functions in `lib/pricing.ts`, constants in `lib/config.ts`. Amounts in EUR, rounded to cents (`roundCents`). Components never compute money themselves.

- `lineTotal`, `subtotal`.
- `isValidPromo(code)`: `DEMO10`, trimmed, case-insensitive. `discount(sub, code)`: 10% of the subtotal.
- `shipping(discountedSubtotal, method)`: standard is free when subtotal - discount >= €75, else €6.95; express is always €12.95.
- `awayFromFreeShipping(discountedSubtotal)`: amount still needed for free standard shipping.
- `totals(lines, promo, method)`: `{ subtotal, discount, shipping, total }`; shipping is 0 for an empty cart.
- The threshold uses the discounted subtotal, so a promo can push an order back under €75 (e.g. €79 + DEMO10 = €71.10 -> €6.95 shipping).

## Cart page `/cart` (M3)

Page: `app/(shop)/cart/page.tsx` (H1 "Cart") renders `components/cart/CartView.tsx` (client).

- Until the cart has hydrated it renders an `aria-hidden` spacer, so there is no false "empty" flash.
- **Lines** (`CartLineItem.tsx`, `cart-line-<key>`): image tile and name both link to the PDP; variant "Colour / Size"; unit price; line total `cart-line-total`. Quantity stepper (`cart-qty-*`, 1..10, minus disabled at 1, group named "Quantity, <name>, <variant>"); Remove (`cart-remove`, named "Remove <name>, <variant>"). Changes update the summary and header count at once.
- **Summary** (`OrderSummary.tsx`, sticky from `lg`): rows from `SummaryRows.tsx` (`cart-subtotal`, `cart-discount`, `cart-shipping`, `cart-total`). Subtotal; "DEMO10 (-10%)" with the discount in `text-success`; Shipping (amount, or "Free"); Total. Cart totals always use standard shipping.
- **Free-shipping hint** (`FreeShippingHint.tsx`, `cart-free-shipping-hint`): "You're €X away from free shipping" plus a progress bar, shown only under the threshold.
- `proceed-to-checkout` -> `/checkout`, then the trust line "Secure checkout · 30-day returns".
- **Empty state** (`EmptyCart.tsx`, `cart-empty`): message plus "Shop all products" -> `/category/all`; no checkout button.
- Two-column layout from `lg` (lines 7/12, summary 5/12), single column on mobile.

## Promo code (M3)

Code: `components/cart/PromoCode.tsx`, rules in `lib/pricing.ts`, state in the cart store (`promoCode`).

- Clean state: a quiet "+ Add a promo code" disclosure (`promo-code-toggle`, `aria-expanded`, icon switches to minus when open) below the summary. Opens a labelled input (`promo-code-input`, `autocomplete="off"`) and `promo-code-apply`. Input and button sit in a row from the `xs` breakpoint (360 px), stacked below it.
- `DEMO10` in any case and with surrounding spaces applies: the summary shows the discount row and the panel shows one line "✓ DEMO10 applied: 10% off your order" next to "Remove code" (`promo-code-remove`). A `sr-only` live region (`promo-code-message`) announces it.
- Anything else (e.g. `DEMO11`, `DEMO 10`, empty) shows "This code isn't valid" in `promo-code-message` (`aria-live="polite"`, icon, `aria-invalid` on the input); no discount.
- The code is stored with the cart (localStorage `tw-cart-v1`), survives reload and carries into checkout. It is cleared with the cart after an order.
- The `prominent` variant (always-open accent block above the rows) is used when `promoField` is ON (see Friction behaviours).

## Shipping rules (M3)

- Standard: free when subtotal - discount >= €75, else €6.95. Express: always €12.95. Shown on the cart (standard only), on the checkout radio cards and in every summary.
- Checkout summary and "Pay €X" update live when the method changes. The confirmation shows the method used.
- `SummaryRows` `shippingDisplay="deferred"` ("Calculated at checkout") is used on the cart when `shippingSurprise` is ON.

## Checkout `/checkout` (M3)

Page: `app/(shop)/checkout/page.tsx` (H1, `DemoBanner`, `CheckoutForm`). Main component `components/checkout/CheckoutForm.tsx` (client).

- **Demo banner** (`DemoBanner.tsx`, `checkout-demo-banner`): "Demo store: no real payment is taken. Use any test details, e.g. 4242 4242 4242 4242." Calm sunken panel with an info icon, also shown above the empty state.
- **Empty cart**: `checkout-empty` (reuses `EmptyCart`), no form or Pay button.
- **Form** (`checkout-form`, `noValidate`), "All fields are required.", fieldsets in this order:
  - Contact: email (`autocomplete="email"`, `inputmode="email"`).
  - Shipping address: first name, last name, street and house number, postcode, town or city, country select (Netherlands default, Belgium, Germany, France). Standard autocomplete values (`given-name`, `family-name`, `address-line1`, `postal-code`, `address-level2`, `country`).
  - Shipping method (`ShippingMethod.tsx`): radio cards `shipping-standard` ("2-4 working days", Free or €6.95) and `shipping-express` ("Next working day", €12.95).
  - Payment: card number, expiry (MM/YY), CVC; all `autocomplete="off"`, `inputmode="numeric"`.
- Inputs use `TextField.tsx`: id and test id `checkout-<field>`, visible label, inline error `error-<field>` with `aria-invalid` and `aria-describedby`.
- **Validation** (`lib/checkout/validation.ts`, pure; clean mode):
  - Errors show on blur and on submit, not while typing; a fixed field clears its error as you type. Changing the country re-validates the postcode.
  - Email format; every field required (plain messages like "Enter your first name").
  - Postcode per country, trimmed and upper-cased: NL `1234 AB` (space optional, any case), BE exactly 4 digits, DE and FR exactly 5. Message names an example: "Enter a postcode like 1234 AB" (or 1000 / 10115 / 75001).
  - Card number: spaces stripped, 13-19 digits, no Luhn. Expiry: MM/YY, month 01-12, not before the current month ("This card has expired"). CVC: 3-4 digits.
  - On submit, focus moves to the first invalid field in visual order (`FIELD_ORDER`: email, first name, last name, street, postcode, city, country, card number, expiry, CVC).
- **Summary** (`CheckoutSummary.tsx`, sticky from `lg`): line thumbnails with variant and quantity, rows `checkout-summary-*`, submit `checkout-submit` "Pay €X" (outside the form, linked with `form=`), trust line, then "Back to cart".
- **Processing**: on a valid submit the button shows a spinner and "Processing…" (`checkout-processing`), is `disabled` and `aria-busy`, stays accent-coloured; inputs are disabled. After 1.5 s it saves the order to sessionStorage `tw-last-order`, navigates to `/confirmation` and clears the cart (including the promo).
- **Expiry auto-slash**: `formatExpiry` (`CheckoutForm.tsx`) turns typed digits into `MM/YY`, adding the `/` after the second digit (not when deleting).
- **Card privacy**: card values live only in component state; they are never persisted, logged, tracked or saved in the order.
- Two-column layout from `lg` (form 7/12, summary 5/12); single column on mobile with the summary after Payment.

## Confirmation `/confirmation` (M3)

Page: `app/(shop)/confirmation/page.tsx` renders `components/confirmation/ConfirmationView.tsx` (client). Order data: `lib/order.ts`.

- Reads the last order from sessionStorage `tw-last-order` via `useSyncExternalStore` (spacer until hydrated).
- With an order: "Order confirmed", H1 "Thank you for your order", order number `confirmation-order-number` (`TW-` + 6 random digits), the email, a demo note, `continue-shopping` -> `/`. Summary `confirmation-summary`: lines, shipping method ("Express (next working day)" / "Standard (2-4 working days)"), rows `confirmation-*`.
- Reload shows the same order (sessionStorage, per tab session). The order carries `purchaseTracked: false`, ready for the M5 fire-once `purchase` event (`markPurchaseTracked`).
- No order (fresh session): `confirmation-no-order` with H1 "No recent order" and "Shop all products" -> `/category/all`.

## Friction behaviours (M4)

Flags are resolved by `lib/flags/` (override > global > env > defaults) and read with `useFlag(key)`; details, triggers and Contentsquare angle in `FRICTION_FLAGS.md`. Wiring:

| Flag | Code |
|---|---|
| `promoField`, `shippingSurprise` | `components/cart/CartView.tsx` passes `promoVariant` / `shippingDisplay` to `OrderSummary` |
| `decoyBanner` | `components/product/DecoyBanner.tsx`, rendered by `PlpListing.tsx` above the sort row; a non-interactive `div` (`plp-decoy-banner`) |
| `buriedCta` | `PurchasePanel.tsx` + `ProductStory.tsx`: on `trailhead-28-backpack` a long specs and care block precedes colour, quantity and Add to cart |
| `deadSwatch` | `PurchasePanel.tsx`: Moss on `field-tote` ignores selection, no disabled state |
| `silentSize` | `PurchasePanel.tsx`: on `storm-shell-jacket`, Add to cart with no size returns silently (no message, no focus) |
| `slowHero` | `components/home/HeroImage.tsx` (client; static hero.svg until flags are ready, swaps to the slow image only if ON) -> `/api/hero-image` (~3.0 s, ~1.73 MB SVG) when ON, `/images/hero.svg` when OFF |
| `postcodeValidation` | `CheckoutForm.tsx` -> `validatePostcode(..., { strict })`: only `^\d{4}[A-Z]{2}$` or `^\d{4,5}$`, message "Invalid input." |
| `expressShippingError` | `CheckoutForm.tsx` `checkExpressZone` -> `lib/checkout/expressRate.ts` throws a real `TypeError` (reading `rate`) for postcodes starting `10` when Express is selected (on postcode change, method change and submit); Standard recovers |

M4 also landed the deferred nice-to-haves: size-chip error border and sticky PDP gallery column (M2 CR 5-6), and `xs:flex-1` / `whitespace-nowrap` fixes in `NewsletterSignup.tsx` and `PromoCode.tsx` (M3 CR 8-9).

## Tracking (M5)

Details and payloads: `TRACKING.md`. Code: `lib/tracking/*`, `components/tracking/*`.

- **Contentsquare tag** and **GA4** (`G-4PLJ26X0Y9`) load on shop routes and 404 only after the visitor accepts the cookie banner, never on `/demo-controls`; both switchable by `NEXT_PUBLIC_*_ENABLED=false`.
- **Virtual page views**: `_uxa trackPageview` on client route changes only (after the tag loaded); initial page view is the tag's own.
- **Dynamic variables**: ten `friction_*` on every page view; `order_value` once on confirmation.
- **dataLayer events**: `page_view`, `view_item` (PDP mount), `add_to_cart` (not when size missing/silentSize blocks), `remove_from_cart` (Remove only), `begin_checkout` (checkout mount, non-empty cart), `purchase` (once per order). Five ecommerce events are also sent to GA4; no manual GA `page_view`.
- **`data-page-type`** on `<body>` for every route (`PageTypeSync`).
- No PII (email, address) or card data in any push.

## Cookie consent and security headers

- **Cookie banner** (`components/layout/CookieBanner.tsx`, `cookie-banner`, `cookie-accept`, `cookie-decline`): fixed bottom region "Cookie consent", Accept / Decline (44 px targets), does not take focus, pads the page so it never covers content. Choice persists in localStorage `tw-consent` (`lib/consent.ts`). Not shown on `/demo-controls`. No withdraw/change UI yet; pre-consent pages are not recorded. Details: `TRACKING.md`.
- **Consent URL param**: `?consent=accept|decline|reset` sets or clears `tw-consent` once on mount (`applyConsentParam` in `lib/consent.ts`, called from `CookieBanner`), then is removed from the URL; `?friction=` etc. are kept; ignored on `/demo-controls`; invalid values ignored. Demo link: `https://tidewild-demo.vercel.app/?consent=accept&friction=all:off`. Demo site: test orders are intentionally recorded as real data.
- **Security headers** (`next.config.ts`): nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy, HSTS and a deliberately loose enforced CSP. Live verification with the real tags pending (`DEPLOYMENT.md`).

## Live toggles and control panel (M6)

Details: `FRICTION_FLAGS.md` (usage), `ARCHITECTURE.md` (code), `DEPLOYMENT.md` (store).

- **`/demo-controls`** (`app/demo-controls/page.tsx`, `components/demo-controls/*`): PIN form (`pin-input`, `pin-submit`, `pin-error`), or `pin-disabled` when `DEMO_CONTROLS_PIN` is unset. After unlock: store status, profile with phase hint (`friction-profile`, `friction-phase`), nine switches (`flag-row-<flag>`, `flag-state-<flag>`, `flag-updated-<flag>`), master buttons `btn-all-on` / `btn-all-off` / `btn-only-fix-errors`, `btn-refresh`, `btn-lock`, `panel-error`, and history (`flag-history-entry`, last 20 shown). noindex, no shop chrome, no tracking tags.
- **Flag API**: public `GET /api/flags` (`app/api/flags/route.ts`); PIN-protected `GET`/`POST /api/demo-controls/flags`. Statuses and payloads in `ARCHITECTURE.md`.
- **Store**: `lib/flags/store/*` (Upstash REST in production, memory locally, none otherwise). Without a store the shop falls back to env and defaults.
- **Visitor side**: `FlagsProvider` fetches `/api/flags` after mount and on route changes older than 30 s.
- **`app/robots.ts`**: allows `/`, disallows `/demo-controls` and `/api/`.

## Planned

- M7 (done): hardening and polish; final DEMO_SCRIPT and TRAFFIC_GUIDE. Open low-severity items: `PROJECT_STATUS.md`.
