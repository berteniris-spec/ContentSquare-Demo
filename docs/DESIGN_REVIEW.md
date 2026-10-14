# Design review log

Owner: designer. Newest first. From now on, every change request in this file includes its exact fix spec, because the Builder works from this file.

## 2026-10-14 - M3 re-review

Method: read the Builder's changes for CR 1-7 in the working tree. Then I ran `npx next dev -p 3200` (stopped afterwards) and used Playwright at 1280x800 and 390x844. The run added the tee and jacket (size M), opened the promo disclosure, tried an invalid code then `demo10`, partially submitted the checkout, paid, and checked the processing state 500 ms after it appeared (well after the transition settles) and the confirmation. I also checked the newsletter at 340 and 390 px for the `xs` breakpoint. There were no console errors.

| CR | Result |
|---|---|
| 1 Processing colour (must) | Fixed. Settled at +500 ms on both widths: background `accent`, white text, cursor `progress`, and `disabled` plus `aria-busy` still set. It shows a teal button with a white spinner and "Processing…", and white on accent passes AA. The Tab focus ring on Pay is unchanged. |
| 2 Promo applied | Fixed. One line, "✓ DEMO10 applied: 10% off your order" in `text-success`, sits next to "Remove code". The live region is `sr-only` and keeps `promo-code-message`, and it announces the success. The invalid message is still visible with its icon and red border. |
| 3 `<dl>` divider | Fixed. The `<dl>` contains only four `div > dt + dd` rows, and the Total row has the `border-t` with spacing that looks the same as before. |
| 4 Focus order (must) | Fixed. With postcode and city both empty, submit sends focus to **Postcode**, at both widths. With only the postcode empty, focus also goes to Postcode. |
| 5 Token classes | Fixed. `--breakpoint-xs: 22.5rem` is in `@theme`. The radio uses `accent-accent` (computed `rgb(31,92,87)`). PromoCode and NewsletterSignup use `xs:`, and no `[...]` arbitrary classes remain in the M3 files. The promo input and Apply are on one row at 1280 and 390, both 48 px tall. |
| 6 Disclosure icon | Fixed. The icon changes to a minus when the field is open. |
| 7 Stepper names | Fixed. The groups are named "Quantity, Merino base tee, Stone / M" and "Quantity, Storm shell jacket, Sea / M". The PDP still says "Quantity". |

### New observations (nice-to-have, non-blocking; can land with M4)

**CR 8 - nice-to-have - `components/home/NewsletterSignup.tsx` and `components/cart/PromoCode.tsx`: below 360 px the stacked input collapses to about 20 px tall.**
In the `flex-col` stack, `flex-1` (flex-basis 0) overrides `h-12`. I saw it at 340 px on the newsletter, and the promo input uses the same pattern. This dates from before CR 5 (`min-[360px]` behaved the same) and does not affect the 390 px review width.
Fix: on both inputs, replace `flex-1` with `xs:flex-1`. The input is already `w-full`, and `h-12` then applies when stacked.

**CR 9 - nice-to-have - `components/cart/PromoCode.tsx`: at 390 px "Remove code" wraps onto two lines next to the success line.**
Fix: add `className="shrink-0 whitespace-nowrap"` to the "Remove code" `Button`. The success text wraps instead, which is fine.

M2 CR 5-6 (size-chip error border, sticky gallery) remain queued as nice-to-have for M4.

VERDICT: APPROVED (CR 8-9 are nice-to-have)

## 2026-10-14 - M3 Cart, checkout, confirmation

Second M3 pass, after the Tester's PASS (239/0). It replaces the earlier M3 section below as the current verdict. Earlier CR 1-3 keep their numbers, and new items start at CR 4.

Method: read every M3 file (`app/(shop)/cart|checkout|confirmation`, `components/cart/*`, `components/checkout/*`, `components/confirmation/*`, `lib/pricing.ts`, `lib/cart/*`, `lib/checkout/validation.ts`). Then I ran `npx next dev -p 3200` (stopped afterwards) and used Playwright at 1280x800 and 390x844 to cover:
- empty cart, empty checkout and the no-order confirmation (fresh context);
- the tee added from its PDP (size M), which is under €75 and shows the hint;
- tee plus Storm shell jacket, with an invalid code, then `demo10`;
- checkout initial state, empty submit, format errors, filled with Express, processing (captured mid-transition and settled at +500 ms), confirmation, and empty checkout after the order;
- scripted Tab and arrow-key runs through the form, the computed outline on every stop, and a check of target sizes and `autocomplete` values.

Friction flags are M4 and out of scope here.

### Works well (no action)
- **Labels and autocomplete:**
  - Every field has a visible label above it. Contact, Shipping address, Shipping method and Payment are fieldsets with `text-xl` legends, and "All fields are required." appears once.
  - Measured `autocomplete` values: `email`, `given-name`, `family-name`, `address-line1`, `postal-code`, `address-level2`, `country`.
  - The card number, expiry and CVC fields are `off` with `inputmode="numeric"`, and email has `inputmode="email"`.
- **Error messaging:**
  - An empty submit shows 9 plain messages with an icon in `text-error` and a red border, with `aria-invalid` and `aria-describedby="error-<field>"`. Focus lands on email.
  - Format errors are helpful: "Enter a postcode like 1234 AB", "Enter a card number of 13 to 19 digits", "This card has expired", "Enter the 3 or 4 digit security code".
  - Errors appear on blur, not while typing, and clear once fixed.
- **Banner:** the exact text in a calm sunken panel with an accent info icon, directly under the H1. At 1280 it is a single 46 px row (y=189). At 390 it fills two lines (y=166), and both lines are visible without scrolling. It never reads as an error.
- **Summary hierarchy:**
  - The rows read Subtotal, then "DEMO10 (-10%)" with −€29.40 in `text-success`, then Shipping (€6.95 or Free in `text-success`), then a divider and Total in `text-xl font-semibold`.
  - The checkout summary adds 64x80 line thumbnails with variant and quantity.
  - "Pay €264.60" puts the total in the CTA, and the summary updates live when Express is chosen (€277.55).
  - The free-shipping hint and progress bar ("You’re €10.00 away") show only under the threshold.
- **Trust cues:**
  - The lock and "Secure checkout · 30-day returns" sit under both primary CTAs.
  - The demo note appears on the confirmation, which shows "Order confirmed" with a check, the `TW-` number (tabular), the email, the shipping method and totals.
  - Taken together, the store feels credible.
- **Mobile checkout:**
  - Single column, with 48 px inputs and the name and postcode/city pairs stacked.
  - Radio cards are full width (about 76 px tall), and the summary, Pay and "Back to cart" come after Payment.
  - No horizontal overflow.
- **Keyboard and focus:**
  - Tab order: email, first name, last name, street, postcode, city, country, shipping radio (one stop), card number, expiry, CVC, Pay, Back to cart, footer.
  - ArrowDown switches to Express.
  - Every stop shows the 2 px `focus` outline. Pay shows the ring at its 2 px offset, clearly outside the accent fill.
  - The disclosure has `aria-expanded`, and the promo error is `aria-live="polite"`.
- **Touch targets:** every control in the cart and checkout `main` is at least 44 px: the stepper is 44, Remove and "Remove code" are ghost h-11, Apply is h-12 from 360 px up, and inputs are h-12. The only smaller items are the cart line name links (18 px tall). They are accepted, because the 96x120 image tile beside each one is a large pointer target to the same PDP.
- **Contrast:** only AA token pairs are used (`ink-2`/`muted` on surface/canvas/sunken, `error`, `success`, white on `accent`). The exception is the processing state; see CR 1.
- **Tokens:** no hex, no default palette and no `font-bold` in M3 files. The two arbitrary values are covered in CR 5.
- **States:**
  - Empty cart and empty checkout: a calm surface panel with copy and a primary "Shop all products". Checkout keeps the banner above it.
  - No order: an H1 "No recent order", copy and a primary CTA.
  - The pre-hydration spacer avoids a false empty flash.
  - No console errors in either run.

### Status of earlier items
- M3 CR 1-3 (processing colour, promo applied duplicate, `<dl>` divider): **not landed**. They are restated below.
- M2 CR 5-6 (size-chip error border, sticky gallery): **not landed**. `SizeSelector.tsx` still uses `border-line-strong` in the error state, and the gallery column in `PurchasePanel.tsx` is not sticky. They stay nice-to-have and can land with M4.

### Change requests (exact fixes)

**CR 1 - must-fix (still open) - `components/ui/Button.tsx`: "Processing…" settles to grey.**
I measured the settled state at +500 ms: `bg-sunken` with `text-muted` text. It reads as broken or unavailable at the payment moment, and the Tester flagged it too. (Screenshots taken within 150 ms catch the colour transition and look teal; that is misleading.)
Fix: in `VARIANTS.primary` append `aria-busy:bg-accent! aria-busy:text-white! aria-busy:cursor-progress`. Keep `disabled` and `aria-busy` on the button. A "Sold out" button stays grey.

**CR 2 - nice-to-have (still open) - `components/cart/PromoCode.tsx`: the applied state says the same thing twice.**
Fix, in the `if (promoCode)` branch:
- Replace the "Code … applied" `<p>` with `<p className="flex items-center gap-1.5 text-sm text-success"><CheckIcon size={16} className="shrink-0" /><span>{promoCode} applied: 10% off your order</span></p>`.
- Replace `{messageEl}` with `<div aria-live="polite" data-testid="promo-code-message" className="sr-only">{message?.text}</div>`.

**CR 3 - nice-to-have (still open) - `components/cart/SummaryRows.tsx`: the divider is a `<div>` inside the `<dl>` with no dt/dd.**
Fix: delete `<div className="my-4 border-t border-line" />` and give the Total row `className="mt-4 flex justify-between border-t border-line pt-4 text-xl font-semibold text-ink"`.

**CR 4 - must-fix - `lib/checkout/validation.ts`: focus goes to the wrong field when the postcode and city are both empty.**
`FIELD_ORDER` lists `city` before `postcode`, but the form shows (and tabs through) Postcode first, then Town or city. When I filled email, names and street and submitted, focus landed on "Town or city" (the second field in the row), skipping the first error. PLAN section 9 says "focus first invalid field".
Fix: change the order to `"email", "firstName", "lastName", "address", "postcode", "city", "country", "cardNumber", "cardExpiry", "cardCvc"`. No UI change.

**CR 5 - nice-to-have - `components/checkout/ShippingMethod.tsx` and `components/cart/PromoCode.tsx`: two arbitrary-value classes.**
They are `accent-[var(--color-accent)]` and `min-[360px]:`. Both were tolerated in DESIGN_TOKENS, but the convention is token-only classes.
Fix:
- In ShippingMethod, change `accent-[var(--color-accent)]` to `accent-accent`.
- In `app/globals.css` `@theme`, add `--breakpoint-xs: 22.5rem;`.
- In PromoCode, replace `min-[360px]:flex-row` with `xs:flex-row` and `min-[360px]:h-12` with `xs:h-12`.
- Apply the same change in `NewsletterSignup.tsx` if it uses `min-[360px]`.

DESIGN_TOKENS sections 3, 6 and 7 are updated to match.

**CR 6 - nice-to-have - `components/cart/PromoCode.tsx`: the disclosure icon does not change when it opens.**
"+ Add a promo code" keeps the plus sign while the input is open.
Fix: render `{inputVisible ? <MinusIcon size={16} /> : <PlusIcon size={16} />}` (import `MinusIcon` from `@/components/ui/icons`). Leave the label text as it is.

**CR 7 - nice-to-have - `components/product/QuantityStepper.tsx` and `components/cart/CartLineItem.tsx`: steppers in a cart with several lines are indistinguishable to screen readers.**
Each line announces the same "Quantity" group with "Decrease quantity" and "Increase quantity". Remove already names its item.
Fix:
- Add an optional prop `label?: string` to QuantityStepper and use `aria-label={label ?? "Quantity"}` on the group.
- In CartLineItem, pass ``label={`Quantity, ${item.name}, ${variant}`}``.
- The PDP is unchanged.

VERDICT: CHANGES REQUESTED (2 must-fix: CR 1, CR 4)

## 2026-10-14 - M3 Cart, checkout, confirmation

Method: read every M3 component. Then, on `npm run dev -- -p 3200` (stopped afterwards), Playwright at 1280x800 and 390x844 covered:
- empty cart; one line under €75; two lines with DEMO10 invalid and valid;
- checkout: empty submit, a valid Express submit, the processing state, confirmation, and empty checkout after the order;
- a scripted Tab pass through the checkout form.

The M4 hook variants were reviewed in code (not wired yet).

### Works well (no action)
- **Cart:**
  - Clear line hierarchy and a correct summary: Subtotal, "DEMO10 (-10%)" with −€27.40 in `text-success`, Shipping €6.95 or "Free", a divider, Total in `text-xl`.
  - The free-shipping hint with progress bar shows only under the threshold.
  - One primary "Proceed to checkout", then the lock trust line, then the quiet promo disclosure.
  - Invalid code: "This code isn't valid" with icon, red border and a polite live region.
  - Empty state is a calm panel with a primary "Shop all products".
- **Checkout:**
  - H1, then the demo banner (exact text, sunken, info icon, never red; clearly visible above the form at both widths).
  - "All fields are required." once at the top.
  - Fieldsets with `text-xl` legends (Contact, Shipping address, Shipping method, Payment). Every input has a visible label above it and correct `autocomplete` (card fields `off`).
  - Empty submit: every field shows an icon plus a plain message ("Enter your …"), `aria-invalid`, red border, and focus lands on the first invalid field (email).
  - Errors appear on blur, not while typing, and clear once fixed.
  - Radio cards match the tokens (accent-soft selected, Free in `text-success`).
  - Tab order runs straight through the fields, to Pay, then out.
  - The sticky summary on desktop has line thumbnails, rows, "Pay €246.60" (the total in the CTA is a good trust cue) and the trust line. On mobile the summary and Pay come after the form, as specified, with "Back to cart" below.
- **Confirmation:**
  - "Order confirmed" check, H1 "Thank you for your order", order number `TW-364048` (tabular, `tracking-wide`), the email, and the muted demo note.
  - Primary "Continue shopping"; the summary shows the shipping method and totals. Header count back to 0.
- **Empty checkout:** banner, then the empty panel. Good.
- **M4 hooks (code):**
  - `promoVariant="prominent"`: `rounded-lg bg-accent-soft p-5`, "Have a promo code?" (`text-base font-semibold text-accent-ink`), "Unlock extra savings on your order.", input + secondary Apply, placed above the rows, with Proceed still the only primary. Matches section 10.
  - `shippingDisplay="deferred"`: "Calculated at checkout" in `text-sm text-muted`, the Total excludes shipping, the hint is hidden, and "Free" still shows over the threshold. Matches section 10 and reads as a normal pattern.

### Builder questions
1. **Cart line layout:** approved as built (96x120 tile, linked name, variant and unit price, `sm` stepper plus ghost Remove, line total top-right, `border-line` rows). Now recorded in DESIGN_TOKENS section 7 ("Cart line").
2. **Clean promo:** approved: collapsed disclosure under the trust line, and applied shows the code plus ghost "Remove code". One refinement, CR 2.
3. **Copy:** approved as written:
   - confirmation: "Thank you for your order" / "We’ll send updates to {email}" / the muted demo note;
   - empty checkout: "Your cart is empty, so there is nothing to check out yet.";
   - the "Back to cart" link under the checkout summary.

   The pre-hydration spacer is also approved: it avoids a false empty state flashing on load.

### Change requests (exact fixes)

**CR 1 - must-fix - `components/ui/Button.tsx`: the processing state turns grey and looks disabled.**
During the 1.5 s processing state, "Processing…" picks up `disabled:bg-sunken disabled:text-muted`. It reads as "unavailable/broken" at the payment moment, in replays too.
Fix: in `VARIANTS.primary` append `aria-busy:bg-accent! aria-busy:text-white! aria-busy:cursor-progress`. The Tailwind v4 important suffix lets these win over the `disabled:` utilities. Keep `disabled` and `aria-busy` on the button as they are; no other change. Result: an accent button with a white spinner and "Processing…", and a disabled "Sold out" on the PDP still looks grey.
(This is also written into DESIGN_TOKENS section 7, Buttons.)

**CR 2 - nice-to-have - `components/cart/PromoCode.tsx`: the applied state says the same thing twice.**
After DEMO10 you see "Code DEMO10 applied" and, below it, "✓ DEMO10 applied: 10% off your order".
Fix, in the `if (promoCode)` branch:
- Replace the "Code … applied" `<p>` with `<p className="flex items-center gap-1.5 text-sm text-success"><CheckIcon size={16} className="shrink-0" /><span>{promoCode} applied: 10% off your order</span></p>`. Keep "Remove code" next to it.
- Render the live region there with `className="sr-only"` instead of the visible `messageEl`, so the announcement still happens: `<div aria-live="polite" data-testid="promo-code-message" className="sr-only">{message?.text}</div>`.
- Keep the testid on that live region so the tests still find the message text.
- The error and prominent states are unchanged.

**CR 3 - nice-to-have - `components/cart/SummaryRows.tsx`: invalid child in the `<dl>`.**
`<div className="my-4 border-t border-line" />` is a direct child of the `<dl>` with no `dt`/`dd` (invalid HTML, and some screen readers announce an empty group).
Fix: delete that div and give the Total row wrapper `className="mt-4 flex justify-between border-t border-line pt-4 text-xl font-semibold text-ink"`. It looks the same.

M2 CR 5-6 (size-chip error border, sticky gallery) are still queued, as noted.

VERDICT: CHANGES REQUESTED (1 must-fix: CR 1)

## 2026-10-14 - M2 re-review

Method: `npm run dev -- -p 3200` (stopped afterwards). Playwright at 1280x800 and 390x844 on the home page, `/product/trailhead-28-backpack` and `/product/storm-shell-jacket`. Cart, checkout and confirmation were ignored (M3 in progress).

| CR | Result |
|---|---|
| 1 Thumbnail rail (must) | Fixed. At 1280x800 the 4 thumbnails sit in a left rail, bottoms at y=221/333/445/557, all above the fold. The main image is 593x742. Mobile is unchanged (row under the image). |
| 2 Mobile tile aspect | Fixed. The tiles are landscape 4:3 on mobile and Featured now starts about 1.5 screens higher. |
| 3 Tile products | Fixed. The tiles show the roll-top, overshirt and beanie, so nothing repeats Featured. |
| 4 Newsletter 2 columns | Fixed. Heading and copy on the left, form on the right, bottom-aligned. Mobile is a single column. |

### Tester observations: decisions and specs

**CR 5 - nice-to-have - `components/product/SizeSelector.tsx`: chips get no error border in the clean size-error state.**
Decision: yes. The message with icon is enough for accessibility, but the clean state should be unmistakable next to the `silentSize` ON state in replays.
Fix: in the unselected branch of the chip className, use
`${error ? "border-error" : "border-line-strong"} bg-surface text-ink hover:border-ink`.
Leave the selected branch (`border-ink bg-ink text-canvas shadow-sm`) unchanged. The error already clears in `onChange`, so the border clears with it. With `silentSize` ON (M4) there is still no visual change at all.

**CR 6 - nice-to-have - `components/product/PurchasePanel.tsx`: the gallery column leaves a large empty area under the image next to long story text.**
Decision: yes, make the gallery sticky. I tried it in the browser and it behaves well. It will matter more in M4, when `buriedCta` makes the info column much longer.
Fix: change `<div className="lg:col-span-7">` to `<div className="lg:col-span-7 lg:sticky lg:top-20 lg:self-start">`.
- Use `top-20` (80 px: the 64 px header plus 16 px), not `top-24`. The rail layout makes the gallery about 742 px tall, so `top-20` keeps almost all of it in view at 800 px (only empty backdrop at the bottom edge is cropped).
- Do not make the info column sticky.
- Below `lg` it is not sticky.

Both are recorded in DESIGN_TOKENS section 7 (size chips) and section 9 (gallery column).

VERDICT: APPROVED (CR 5-6 are nice-to-have; they can land with M3 or M4)

## 2026-10-14 - M2 Catalogue and cart store

Method: read every M2 component, then ran `npm run dev -- -p 3200` (stopped afterwards). Playwright at 1280x800 and 390x844 covered:
- the home page (full), newsletter error and success, PLP with sort (UI and `?sort=price-desc`);
- the PDP (Storm shell jacket; low-stock Hip pack; sold-out Trail shorts): size error, add to cart, the drawer;
- scripted keyboard runs.

### Works well (no action)
- **Tokens:** no stray hex, arbitrary px values, `font-bold` or `outline-none`. The drawer animation is a theme token, applied through `motion-safe:`.
- **Home:**
  - The hero matches section 8: original layered coast art, 865 B, one H1, one line of subcopy, CTA to `/category/all`.
  - Category tiles use the surface label chip and never put text on the art.
  - The Featured row has 4 cards and a "View all" text link.
- **Newsletter:** labelled input, inline error with icon and `role="alert"`, and a thank-you with `role="status"`. No network request.
- **PLP:**
  - Title and count, then a labelled "Sort by" select (h-12, chevron, focus ring visible).
  - `?sort=price-desc` loads into the select, and the 2/3/4-column grid matches the tokens.
- **PDP:**
  - Name, price and stock: the low-stock pill plus "Only a few left"; sold out shows a disabled "Sold out" button with the explanation.
  - Swatches are a radiogroup: 44 px hit area, inset ring, selected ring with offset, roving tabindex. ArrowRight moves focus and selects ("Colour: Rust" updates).
  - Size chips are a radiogroup with nothing preselected.
  - Clean size error: "Please select a size" with icon, `role="alert"`, the group gets `aria-describedby`, and focus moves to XS.
  - The stepper disables − at 1. Add to cart is full width.
  - Description and bullets, then the story below the CTA (correct for the clean layout), then "You may also like" with 4 same-category products.
- **Keyboard flow on the PDP (tab order):** skip link, logo, 4 nav links, cart, 4 thumbnails, swatch group, size group, qty +, Add to cart, related cards, footer. It is logical, with one tab stop per radiogroup.
- **Drawer (desktop and mobile):**
  - Opens on add with the title "Added to cart"; focus goes to Close.
  - Tab loops Close, View cart, Checkout. Esc closes it and focus returns to Add to cart.
  - Scrim `bg-ink/40`, body scroll locked, full width on mobile.
  - Line tile 64x80 with "Sea / M" and "1 × €229.00", subtotal row, the neutral shipping note, secondary View cart and primary Checkout.
- **Header count:** updates to 1 with the accessible name "Cart, 1 item". The header cart stays a link (as decided).

### Builder questions
1. **Thumbnails 80x100 instead of `size-20`:** approved. 4:5 art in a 4:5 tile is better than letterboxing. DESIGN_TOKENS section 9 is updated (`h-25 w-20`).
2. **Values strip and newsletter:** the values strip is approved as built and is now specified in DESIGN_TOKENS section 7. The newsletter is approved for mobile. For desktop I've specified a 2-column layout (CR 4, nice-to-have), also in section 7. The `md` primary "Sign up" button matching the h-12 input is accepted, and the inline input + button rule is updated to match.
3. **Other notes:** `?sort=featured` on an explicit choice is fine. The select being briefly disabled before hydration is fine. The story below the CTA is correct for the clean state.

### Change requests (exact fixes)

**CR 1 - must-fix - `components/product/ProductGallery.tsx`: thumbnails are below the fold on desktop.**
At 1280x800 the 4:5 main image runs from y≈120 to y≈980, so the thumbnails start around y≈1000 and are invisible on first view. Visitors (and the heatmaps) won't find the other views. Fix: from `lg` up, use a vertical thumbnail rail to the left of the main image. Keep the DOM order (main first) and reverse it visually:
- Outer wrapper `<div>` → `className="lg:flex lg:flex-row-reverse lg:items-start lg:gap-4"`.
- Main image div: add `lg:min-w-0 lg:flex-1` (keep `aspect-[4/5] overflow-hidden rounded-lg bg-image`).
- Thumbnail container: `className="mt-4 flex flex-wrap gap-3 lg:mt-0 lg:flex-col lg:flex-nowrap"`.
- Thumbnail buttons unchanged (`h-25 w-20 ...`).
- Below `lg`, nothing changes.

**CR 2 - nice-to-have - `components/home/CategoryTiles.tsx`: on mobile the three stacked 4:5 tiles take about 1,400 px, which pushes Featured three screens down.**
Fix: change the tile class `aspect-[4/5] md:aspect-[3/4]` to `aspect-[4/3] sm:aspect-[4/5] md:aspect-[3/4]`. Nothing else changes; the SVG uses `meet`, so the product just scales down inside the tile.

**CR 3 - nice-to-have - `components/home/CategoryTiles.tsx`: the Bags and Apparel tiles show the same drawings as the first two Featured cards right below them (Trailhead backpack, Storm shell jacket), which reads as repetition.**
Fix: in `TILES`, use `roll-top-pack` for Bags and `canvas-overshirt` for Apparel, and keep `wool-beanie` for Accessories.

**CR 4 - nice-to-have - `components/home/NewsletterSignup.tsx`: on desktop the block sits in the left 45%, with an empty right half and a large gap above the footer, so it feels unfinished.**
Fix:
- Replace the inner `<div className="max-w-xl">` with `<div className="md:grid md:grid-cols-2 md:items-end md:gap-12">`.
- Wrap the `h2` and the intro `p` in a first `<div>`.
- Put the form or thank-you in a second `<div className="mt-6 md:mt-0">`. Remove `mt-6` from the `form` and the thanks `p` (the wrapper now carries it).
- Mobile is unchanged (single column).

VERDICT: CHANGES REQUESTED (1 must-fix: CR 1)

## 2026-10-14 - M1 re-review

Method: `npm run dev -- -p 3200` (stopped afterwards). Playwright screenshots of `/category/all` (1280 px), the mobile menu and the 404 page with footer (390 px), skip-link focus, and the "Colours and views" grid for every changed product: tee, duffel, slim card wallet, travel wallet, daypack, sling, key clip, jacket, hoodie, overshirt, fleece and trousers.

| # | Item | Result |
|---|---|---|
| 1 | Skip link padding (must) | Fixed. `focus:px-4 focus:py-3`; it shows as a padded surface chip with the focus ring. |
| 2 | Tee length (must) | Fixed. The hem now sits clearly above the outerwear hems, so it reads as a tee in all 4 colours, chalk outline included. |
| 3 | Duffel (must) | Fixed. A wide barrel with a handle, end rings and a front pocket. The side view is a round end. It reads as a duffel at card size. |
| 4 | Two wallets (must) | Fixed. The slim card wallet is now a small card holder. The travel wallet (new `zip-wallet`) is a tall zip wallet with a wrist loop. They are clearly different products. |
| 5 | Daypack vs Trailhead | Fixed. The new `daypack` silhouette (rounded top, curved zip, small front pocket) is clearly a different pack. |
| 6 | Sling | Fixed. The long diagonal crossbody strap now makes it read as a sling. **The strap running to the tile edges is accepted.** The "no clipping" rule protects the product body, and here the body, buckle and hardware stay inside the tile while only the thin strap is cropped, like a normal catalogue crop. DESIGN_TOKENS section 9 now records this exception. |
| 7 | Key clip scale | Fixed. It is now smaller than the bottle and beanie. |
| 8 | Apparel highlight | Fixed. The soft curved highlight follows the shoulder, including in the detail view. |
| 9 | Trousers | Fixed. Longer and tapered; they read as trousers. |
| 10 | Mobile nav border | Fixed. `border-t` under the bar and a single bottom border. |
| 11 | Footer rhythm | Fixed. Every column has `mt-2` and 44 px rows, and it shows 2 columns on mobile. |
| 12 | Apostrophe | Fixed ("doesn’t"). |

No regressions seen in the header, focus ring, grid, tokens or the other silhouettes.

Optional polish, not blocking and no action needed for M1: the key clip at 62% is on the small side, and its label patch disappears at card size. If it is touched again, 70% would be fine.

VERDICT: APPROVED

## 2026-10-14 - M1 Foundation and brand

Scope: PLAN section 9 "Global / shell", DESIGN_TOKENS.md, and the SVG product imagery for all 24 products, in every colour and view. Method: read the code, then ran a production build on port 3200 and took Playwright screenshots at 1280 and 390 px (`/category/all`, the "Colours and views" preview on all 24 PDPs, the mobile menu, keyboard focus, 404, placeholders). Some later probes ran on `next dev`, because the Tester rebuilt `.next` while I was testing.

### What works well
- Tokens: `globals.css` matches section 6 exactly. There is no hex, Tailwind default palette, arbitrary px value, `font-bold` or `outline-none` in any component (hex only appears in the SVG renderer and `app/icon.svg`, as allowed). The system font stack is used and Geist is gone.
- Header: sticky, `h-16`, translucent canvas. Wordmark and glyph match section 0. Current nav item has `aria-current` and the accent underline. The cart link is 44 px with the accessible names "Cart, empty" / "Cart, N items", and the count is hidden at 0.
- Mobile nav: 44 px menu button with `aria-expanded`/`aria-controls`, centred wordmark, stacked rows of about 50 px. Esc closes the menu and returns focus to the button, and a route change also closes it.
- Landmarks: `header`, a labelled `nav`, `main#main[tabindex=-1]` and `footer` are all present. The skip link moves focus to `main`. The global focus ring shows on nav links, buttons and cards, and the card ring sits at offset 4 around the whole card. Touch targets are at least 44 px everywhere except inline footer text links (those are 44 px tall, which is fine).
- 404 is on-brand and matches the tokens. The PLP grid, card typography, price format (`€139.00`, tabular) and stock badges match section 7.
- Imagery overall: a coherent, calm, credible set. The flat fills, single shade and highlight, dashed seams, neutral label patch and fixed hardware are consistent across all 24 products. Colour variants read as "the same product dyed differently". Light colours (oat, chalk) get their outline, and dark colours (charcoal, navy) keep visible detail lines thanks to the lighten fallback. Nothing clips in front, back or side views, and the detail crops are framed well. Standouts: the backpacks, roll-top, tote, beanie, cap, fleece, hoodie, overshirt, vest, shorts, laptop sleeve, tech pouch and bottle.

### Issues
1. **Skip link has no padding when focused** (must-fix). `focus:not-sr-only` resets padding to 0 in Tailwind v4 and overrides the unprefixed `px-4 py-3`. The result is a bare, cramped label that overlaps the wordmark (measured: padding 0px, 20 px tall).
2. **Merino base tee reads as a tunic** (must-fix; this answers the Builder's question). The hem sits at y=428, level with the jackets and hoodie, so the tee is longer than the outerwear.
3. **Weekender duffel does not read as a duffel** (must-fix). The front is roughly square (240 x 250), so at card size it looks like a box bag or cooler. A duffel needs a wide, low barrel shape.
4. **Slim card wallet and travel wallet are identical drawings** (must-fix). Both use `wallet` at the same size, and they sit in the same Accessories grid, so it looks like copy-paste. The card wallet is also drawn as large as the laptop sleeve.
5. Daypack 18 and Trailhead 28 are the same drawing in a different colour (nice-to-have).
6. City sling reads as a handbag or bowling bag, because of its short top handle (nice-to-have).
7. Key clip is drawn taller than the bottle, which is out of scale within Accessories (nice-to-have).
8. The highlight on apparel (jacket, fleece, hoodie, overshirt) is a hard rectangle that looks pasted on, especially in the detail view (nice-to-have).
9. Rain trousers are short and wide for their length, close to culottes (nice-to-have).
10. The open mobile menu has a doubled bottom border, because both the header and `#mobile-nav` draw `border-b`. There is also no divider between the bar and the links (nice-to-have).
11. Footer rhythm is uneven: Shop links are 44 px rows with `mt-2`, while Help/About are `space-y-3` with `mt-3`. On mobile the columns stack into a long list (nice-to-have).
12. The 404 H1 uses a straight apostrophe (nice-to-have).

### Answers to the Builder
1. **Tee:** yes, shorten it. See CR 2.
2. **Header cart:** it stays a **link to `/cart`** in M2 and later. Only Add to cart opens the mini-cart drawer, and the drawer has its own "View cart" link. A real `/cart` page view keeps the funnel step clean for Contentsquare and avoids two competing cart paths. DESIGN_TOKENS section 7 is updated to match (drawer focus returns to Add to cart only).
3. **Placeholder copy:** yes, "This page is coming soon." on cart/checkout/confirmation is fine until M3, because PagePlaceholder is neutral and on-brand. It must be gone by the M3 review.

### Verdict
CHANGES REQUESTED. Four must-fix items (CR 1-4), all small; see the change requests in the designer's message.
