# Test report

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
