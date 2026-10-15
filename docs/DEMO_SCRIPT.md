# Demo script (Contentsquare interview)

Run order for a live demo of Tidewild, built only from what is implemented. Background: `FRICTION_FLAGS.md` (flags, panel), `TRACKING.md` (what Contentsquare receives), `TRAFFIC_GUIDE.md` (how to generate the sessions you will analyse). Production: https://tidewild-demo.vercel.app (replace `<origin>` below; for rehearsal use `http://localhost:3000`).

**Important**: a bare deployment (no `NEXT_PUBLIC_FRICTION_*` set, empty store) shows **8 flags ON** (profile `baseline`, Phase A) and `expressShippingError` OFF. The clean state only exists when you ask for it: `?friction=all:off` or the panel's **All friction OFF**.

## Before you start (10 min)

1. Production runs the M4-M7 build and Contentsquare has `tidewild-demo.vercel.app` allow-listed (`DEPLOYMENT.md`).
2. Open `<origin>/demo-controls`, enter the PIN, check: store status says Upstash, profile says Phase A (`baseline`). If `expressShippingError` is ON, switch it OFF. Keep this tab in its own window; no tags load there.
3. Sessions already exist from earlier traffic (`TRAFFIC_GUIDE.md`): phase A baseline data, then phase B (error ON) data, then phase C (fixed) data, with switch times noted. Contentsquare needs time to process; do not rely on generating data during the demo.
4. Bookmark the Contentsquare views you will open (funnel, click/scroll maps for `/category/*` and the backpack PDP, a replay segment, error analysis). Segment on the dynamic variable `friction_profile`.
5. Rehearsal tip: every live moment below can be rehearsed on any browser with `?friction=` (per tab session, overrides the panel). Use a private window and `?friction=reset` to start clean.

## Phase overview

| Phase | Panel state | `friction_profile` | Story |
|---|---|---|---|
| A baseline | 8 on, `expressShippingError` OFF | `baseline` | Funnel leaks, dead clicks, buried CTA, silent failures |
| B express error | switch `expressShippingError` ON | `express_error` | JS error spike at checkout, revenue at risk |
| C fixed | **Only fix errors** | `fixed` | Errors gone, other friction remains, conversion recovers |

## 1. Funnel analysis (flags `promoField`, `shippingSurprise`)

Funnel steps (page groups): Home `/` -> PLP `/category/*` -> PDP `/product/*` -> Cart `/cart` -> Checkout `/checkout` -> Confirmation `/confirmation`. Target shape from the traffic guide: about 100 landed, 65 PLP, 45 PDP, 20 add to cart, 15 cart, 9 checkout, 4-5 purchases.

Show:
1. Open the funnel; point at the biggest relative drops: PDP to add to cart, and **Cart to Checkout**.
2. Explain the cart friction live at `<origin>/product/hip-pack` (EUR 45, under the EUR 75 free-shipping threshold): add to cart, open `/cart`. Show the prominent promo block (`promoField`, the prominent promo block that invites code hunting) and the shipping line "Calculated at checkout" (`shippingSurprise`); the EUR 6.95 only appears in checkout.
3. Contrast with `<origin>/cart?friction=promoField:off,shippingSurprise:off`: quiet "+ Add a promo code" link and a visible shipping cost.

Talk track: "Two small design choices make people leave the cart: a promo field that sends them hunting for a code, and a shipping cost they cannot see. The funnel shows where, the segment on `friction_promo_field` / `friction_shipping_surprise` shows why, and the before/after is a flag flip."

Contentsquare features: Conversion funnel, step drop-off, segmenting by dynamic variables, journey/exit pages on `/cart`.

## 2. Heatmaps and zoning (flags `decoyBanner`, `buriedCta`)

1. **Decoy banner**: open `<origin>/category/bags`. A "Seasonal edit: new colours just landed" strip above the sort row looks like a button (pointer cursor) but is a plain `div` (`plp-decoy-banner`). In Contentsquare's click map for the PLP page group: clicks on a non-interactive element, attention without outcome. Mention zoning: a zone with clicks and no conversion.
2. **Buried CTA**: open `<origin>/product/trailhead-28-backpack` on a 390 px viewport (device toolbar or a phone). A long specs and care block sits above colour, quantity and Add to cart. Scroll map: the CTA is below the fold with low reach; zone report: click rate on `add-to-cart` is low versus other PDPs. Compare `<origin>/product/trailhead-28-backpack?friction=buriedCta:off` (short story moved below the CTA).
3. Side note you can mention honestly: on mobile the standard PDP still places Add to cart low (about y 996 at 390 px) even with `buriedCta` OFF, so the contrast is relative, not absolute.

Talk track: "The click map says people want to click something that is not clickable; the scroll map says the key action is where half the visitors never get to. Zoning turns both into numbers per page region."

Contentsquare features: click map, scroll map, zoning (stable `data-testid` hooks such as `add-to-cart`).

## 3. Session replay (flags `deadSwatch`, `silentSize`, `slowHero`)

Pick or create these sessions (rehearse live, then show the recorded ones):

1. **Slow hero**: `<origin>/` on a fresh private window. The hero stays an empty frame for about 3 s, then a ~1.7 MB image appears. Replay shows a blank first impression and early scrolling; speed/LCP is weak on the homepage.
2. **Dead swatch**: `<origin>/product/field-tote`, click the **Moss** swatch repeatedly. Nothing changes (it looks selectable). In replay: repeated clicks on the same element, flagged as frustration (rage/dead clicks).
3. **Silent size**: `<origin>/product/storm-shell-jacket`, press **Add to cart** without choosing a size, several times. No message, no cart update, no event. Replay: repeated clicks without response, hesitation, exit. Contrast: any other product shows "Please select a size".

Talk track: "No error is logged for any of these; analytics events alone show nothing. Replay and frustration signals are the only place you see the user struggling."

Contentsquare features: session replay, frustration scoring (rage clicks, dead clicks), speed analysis, filtering sessions by `friction_dead_swatch`, `friction_silent_size`, `friction_slow_hero`.

## 4. Error analysis (flags `postcodeValidation`, `expressShippingError`)

Part 1, baseline (Phase A): checkout form validation.
1. Fill the cart (`/product/hip-pack`, `/cart`, **Proceed to checkout**). In checkout use postcode `1234 AB` (valid in the Netherlands, the default country) and tab out: "Invalid input." (strict rule: only `1234AB` or 4-5 digits pass). Replay shows retries, rewriting, abandonment. This is a form-field error, not a JS error.
2. Compare `<origin>/checkout?friction=postcodeValidation:off`: helpful message "Enter a postcode like 1234 AB".

Part 2, the live moment (Phase B): turn the JS error on **from the control panel**.
1. In the `/demo-controls` window, switch `expressShippingError` **ON**. Profile becomes `express_error`; the phase line says B.
2. In a fresh private window (a new visitor; allow up to about 60 s on Vercel for the CDN-cached `/api/flags`, or press Refresh in the panel and reload), add any item, go to checkout, choose **Express** (EUR 12.95), enter a postcode starting `10` (for example `1012AB` in NL, or `10115` with country Germany; the error fires as soon as Express and the postcode are both set, and again on Pay). A real uncaught `TypeError: Cannot read properties of undefined (reading 'rate')` is thrown from `lib/checkout/expressRate.ts` (browser console). Switching to **Standard** recovers.
3. Open Contentsquare error analysis: the JavaScript error with its stack, number of sessions affected and revenue impact, and open the replay at the moment of the error. Because Contentsquare processing takes time, show previously recorded phase B sessions and refer to this one as the proof it is real.
4. Segment with `friction_profile = express_error` vs `baseline`.

Part 3, fix (Phase C): in the panel press **Only fix errors** (all friction stays on except `expressShippingError` and `postcodeValidation`). Profile becomes `fixed`. Repeat step 2: no error; the postcode accepts `1234 AB`. In Contentsquare, compare conversion and error counts across the phases using the `friction_profile` segment and the date ranges from the panel's change history (last 20 changes with timestamps).

Talk track: "Same site, same traffic. At 14:05 I flipped one flag; errors start at that minute, checkout conversion falls, and the revenue impact is attached. At 14:30 I fixed it, and the same segment shows recovery. No redeploy was needed."

Contentsquare features: error analysis (JS errors, impact on revenue, affected sessions), replay at the error, segmentation by dynamic variables, `order_value` dynamic variable for purchase value.

## Run order for the live session

1. 2 min: store and brand, `?friction=all:off` clean shop (the "what good looks like" view).
2. Funnel (section 1) with phase A data.
3. Heatmaps (section 2).
4. Replay (section 3): one prepared replay plus one live dead-swatch demonstration.
5. Errors Part 1 (postcode), then the **live moment**: Phase B from the panel, trigger in a private window, show the error in Contentsquare (prepared data if live data is still processing).
6. Phase C: press **Only fix errors**, show the before/after.
7. Leave the panel in a known state (Phase A: set `expressShippingError` OFF, others ON) or use **All friction OFF** to hand over a clean store. Lock the panel.

## Quick reference

| Need | Do |
|---|---|
| Reset one browser | `?friction=reset` |
| Everything clean (this tab) | `?friction=all:off` |
| Phase B in this tab only | `?friction=expressShippingError:on` |
| Phase C in this tab only | `?friction=expressShippingError:off,postcodeValidation:off` |
| Valid card | `4242 4242 4242 4242`, any future expiry, any CVC (demo banner; no payment is taken) |
| Valid promo | `DEMO10` (10% off); anything else shows an error |
| Free shipping | standard free from EUR 75 (after discount), otherwise EUR 6.95; Express always EUR 12.95 |
| Panel API check | `GET <origin>/api/flags` (public, CDN-cached) |

Known limits to keep in mind during the demo: `page_view` can arrive up to about 1.5 s after load; the 404 page sends no `page_view`; Contentsquare and GA4 are verified only with test stubs locally (`DEPLOYMENT.md` post-deploy checks).
