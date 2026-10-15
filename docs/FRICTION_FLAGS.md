# Friction flags

Status: **built (milestones 4 and 6; final in M7)**: behaviours, `?friction=` URL overrides, the global live store (`/api/flags`), and the PIN-protected control panel `/demo-controls`. Contentsquare dynamic variables for the flags are built (M5, `docs/TRACKING.md`). Spec: `docs/PLAN.md` sections 7 and 9; decisions: `docs/DECISIONS.md`.

All friction is intentional and flag-gated. Do not "fix" it in code; turn the flag off instead.

## Flags

Code: defaults and metadata in `lib/config.ts` (`FRICTION`, `FLAG_META`, target constants); UI reads a flag only through `useFlag(key)`.

| Flag | Default | Capability | Env var | Where |
|---|---|---|---|---|
| `promoField` | on | funnel | `NEXT_PUBLIC_FRICTION_PROMO_FIELD` | `/cart` |
| `shippingSurprise` | on | funnel | `NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE` | `/cart` |
| `decoyBanner` | on | heatmaps | `NEXT_PUBLIC_FRICTION_DECOY_BANNER` | PLPs |
| `buriedCta` | on | heatmaps | `NEXT_PUBLIC_FRICTION_BURIED_CTA` | `/product/trailhead-28-backpack` |
| `deadSwatch` | on | replay | `NEXT_PUBLIC_FRICTION_DEAD_SWATCH` | `/product/field-tote` |
| `silentSize` | on | replay | `NEXT_PUBLIC_FRICTION_SILENT_SIZE` | `/product/storm-shell-jacket` |
| `slowHero` | on | replay | `NEXT_PUBLIC_FRICTION_SLOW_HERO` | `/` |
| `postcodeValidation` | on | errors | `NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION` | `/checkout` |
| `expressShippingError` | **off** | errors | `NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR` | `/checkout` |

Env values accept `on`/`off`, `true`/`false`, `1`/`0` (case-insensitive); anything else counts as unset (`lib/flags/env.ts`).

## What each flag does and what it shows in Contentsquare

| Flag | Behaviour when ON | Contentsquare capability / how it shows up |
|---|---|---|
| `promoField` | Cart shows the promo block always open and prominent above the totals (`OrderSummary` `promoVariant="prominent"`). OFF: quiet "+ Add a promo code" disclosure. | Funnels: cart -> checkout drop-off; users leave to hunt for a code. Compare cart-step conversion ON vs OFF. |
| `shippingSurprise` | Cart shows "Calculated at checkout" instead of the shipping cost (`shippingDisplay="deferred"`); the cost only appears at checkout. | Funnels: drop between cart and checkout payment. Pair with `promoField` for the funnel story. |
| `decoyBanner` | A "Seasonal edit: new colours just landed" banner above the PLP sort row (`components/product/DecoyBanner.tsx`, `plp-decoy-banner`). It is a plain `div`: no link, no handler, not focusable, but styled and `cursor-pointer` like a button. | Heatmaps: click map shows clicks on a dead element; zoning shows attention with no conversion. Replay: repeated clicks. |
| `buriedCta` | On `trailhead-28-backpack` only, a long specs and care block (`ProductStory` `long`) sits above colour, quantity and Add to cart, pushing the CTA far down. OFF: the short story goes below the CTA. | Heatmaps: scroll map and zoning show the CTA below the fold with low reach and click rate. |
| `deadSwatch` | On `field-tote` only, the Moss swatch looks and focuses normally but selecting it does nothing (no disabled state). | Session replay: repeated clicks on the swatch; Frustration signals (rage/dead clicks) in click analysis. |
| `silentSize` | On `storm-shell-jacket` only, Add to cart without a size silently does nothing: no message, no focus move, no event. OFF (and all other products): "Please select a size" alert and focus on the first size. | Session replay: repeated Add to cart clicks with no response, hesitation, abandonment. |
| `slowHero` | Homepage hero loads `/api/hero-image` (`app/api/hero-image/route.ts`): the same art plus ~12,000 tiny strokes (~1.73 MB), served after a ~3.0 s delay. OFF: static `/images/hero.svg`, and `/api/hero-image` is never requested. | Replay: blank hero, slow first impression; speed analysis (LCP). |
| `postcodeValidation` | Checkout postcode accepts only `^\d{4}[A-Z]{2}$` (no space, upper-case) or `^\d{4,5}$`, and the message is "Invalid input." for everything else. So `1234 AB`, `1234ab` and `1234 ab` are rejected, `1234AB` and `10115` pass. OFF: per-country clean rules with a helpful message. | Error analysis and replay: form-field errors on the postcode field, repeated attempts, abandonment at checkout. |
| `expressShippingError` | Selecting Express (or typing a postcode) with a postcode starting `10` while Express is chosen throws a real `TypeError: Cannot read properties of undefined (reading 'rate')` from `lib/checkout/expressRate.ts` (unhandled, in an event handler). Choosing Standard recovers. Also checked on submit. | Error analysis: JavaScript error with stack, affected sessions and revenue impact; replay at the moment of the error. Off by default: Phase B. |

Targets are constants in `lib/config.ts`: `BURIED_CTA_SLUG`, `DEAD_SWATCH`, `SILENT_SIZE_SLUG`, `EXPRESS_ERROR_POSTCODE` (`/^10/`).

## Resolution order

`resolveFlags` in `lib/flags/resolve.ts`, highest priority first:

1. **Override**: `?friction=` URL parameter / sessionStorage `tw-friction-overrides` (this browser tab session only).
2. **Global layer**: the live store, set from `/demo-controls`, read by `FlagsProvider` from `GET /api/flags`. Only flags that were set from the panel are present; if no store is configured or it is unreachable the layer is empty and env/defaults apply.
3. **Env**: `NEXT_PUBLIC_FRICTION_*`, inlined at build time (`lib/flags/env.ts`).
4. **Code defaults**: `FRICTION` in `lib/config.ts` (8 on, `expressShippingError` off).

The first layer that has a value for a flag wins; each flag resolves independently.

## Overriding from the URL

Add `?friction=` to any page URL (comma-separated `flag:on|off`):

| Example | Effect |
|---|---|
| `/?friction=slowHero:off` | Turn one flag off |
| `/cart?friction=promoField:off,shippingSurprise:off` | Several at once |
| `/?friction=all:on` / `all:off` | Every flag on / off |
| `/?friction=reset` | Clear all stored overrides |
| `/?friction=reset,buriedCta:on` | Clear, then apply the rest in order |

- Flag names are case-insensitive and ignore `-` and `_` (`dead-swatch:on` works). Unknown names or values are ignored.
- The overrides are saved to sessionStorage **`tw-friction-overrides`** on first load and after every route change, so they survive client-side navigation. The URL is not rewritten. A new tab/session starts clean.
- Overrides apply **after hydration**: the server render and the first client render use env + defaults only (no hydration mismatch), then the override layer is applied. `useFlags().ready` is false until then.
- `HeroImage` (`components/home/HeroImage.tsx`) shows the static `/images/hero.svg` (priority, no empty frame) until flags are `ready`, and only requests `/api/hero-image` when `slowHero` resolves ON; it then remounts the image so the frame is blank until the slow image arrives. An OFF visitor never requests `/api/hero-image`.

## Profile

`deriveProfile` (`lib/flags/resolve.ts`) returns `express_error` if `expressShippingError` is on; `clean` if all flags are off; `fixed` if `postcodeValidation` is off (and express off); else `baseline`. Available as `useFlags().profile`; it is sent to Contentsquare as `friction_profile` (M5).

## Env vars and the e2e server

- All nine `NEXT_PUBLIC_FRICTION_*` variables are optional. They are build-time (`NEXT_PUBLIC_*` is inlined), so changing them needs a rebuild/redeploy. Each is read with its literal `process.env.NAME` so Next can inline it.
- `playwright.config.ts` sets **all nine to `off`** for the e2e `webServer`, so the older specs keep asserting the clean behaviour. `tests/friction.spec.ts` and `tests/friction-matrix.spec.ts` turn flags on per test with `?friction=<flag>:on` (URL overrides beat the env layer).
- Other env: `FLAG_STORE`, `DEMO_CONTROLS_PIN`, Upstash `KV_*` (see `DEPLOYMENT.md`).

## Control panel and live toggles (M6)

Page `/demo-controls` (`app/demo-controls/page.tsx`, `components/demo-controls/*`): noindex, no shop chrome, no Contentsquare/GA tags. Also excluded in `app/robots.ts` (`/demo-controls`, `/api/`).

- **PIN**: `DEMO_CONTROLS_PIN` (server env, 6+ digits). Entered on the page, kept in sessionStorage `tw-demo-pin`, sent as header `x-demo-pin` on every API call (no cookie). **Lock** clears it. If the PIN env var is unset the panel is disabled and says so (`pin-disabled`).
- **Panel content**: store status (`store-status`: Upstash/memory, or "not configured"/error), current profile (`friction-profile`) with a phase hint line (`friction-phase`: A baseline / B express shipping error on / C errors fixed / all friction off), nine switches (80x44, `role=switch`, `flag-state-<flag>` with ON/OFF word, source `global|env|default` and last-changed time), master buttons **All friction ON** (`btn-all-on`), **All friction OFF** (`btn-all-off`), **Only fix errors** (`btn-only-fix-errors`: all on except `expressShippingError` and `postcodeValidation` off), Refresh (`btn-refresh`), Lock (`btn-lock`), and the last 20 changes (`flag-history-entry`; 30 are stored).
- **Effect on visitors**: one store write per click. `GET /api/flags` is CDN-cached (`s-maxage=10`, `stale-while-revalidate=20`), so a new visitor sees a flip within about 60 s on Vercel (not verified locally). `FlagsProvider` fetches once after mount and again on a route change if the last fetch is older than 30 s, so a visitor already browsing picks it up within a navigation or two. A `?friction=` override still wins in that tab.
- **Store**: key `tw:friction` (flags, per-flag `updatedAt`, history). Upstash in production, memory locally. Setup, fallback behaviour and checks: `DEPLOYMENT.md`.
- Using it from a script: `curl -H "x-demo-pin: <PIN>" -H "content-type: application/json" -d '{"action":"toggle","flag":"expressShippingError","value":true}' <origin>/api/demo-controls/flags` (also `{"action":"all_on"|"all_off"|"only_fix_errors"}`). Do not paste the real PIN into the repo or docs.

## Phase workflow

| Phase | Flags | Profile | Panel |
|---|---|---|---|
| A, baseline | defaults: 8 on, `expressShippingError` off | `baseline` | **All friction ON**, then switch `expressShippingError` OFF (or fresh store) |
| B, express error | A plus `expressShippingError` on | `express_error` | switch `expressShippingError` ON |
| C, fixed | `expressShippingError` and `postcodeValidation` off | `fixed` | **Only fix errors** (all other friction stays on) |

Note: **All friction ON** also turns `expressShippingError` on (profile `express_error`), so for Phase A use the individual switch afterwards. **All friction OFF** gives profile `clean`.

### Running a live demo

1. Open `/demo-controls`, enter the PIN, confirm the store status shows Upstash and the profile is Phase A. Open the shop in a second window and generate sessions (see `TRAFFIC_GUIDE.md`).
2. Phase B: switch `expressShippingError` ON. New sessions hit the checkout `TypeError`; Contentsquare error analysis starts showing it (allow for processing delay).
3. Phase C: press **Only fix errors**. Errors stop; compare before/after in Contentsquare using `friction_profile`.
4. Use Refresh to re-read the store; Lock when done. Flags set in the panel persist until changed.
5. Without a store (not configured), use `?friction=` or env vars; the panel shows the store as not configured and cannot change flags.

## Env vars (flags and store)

`NEXT_PUBLIC_FRICTION_*` (build time, see above), `DEMO_CONTROLS_PIN`, `FLAG_STORE` (`none|memory|upstash|empty`), and Upstash `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.

## Known gaps

- Fixed (post-M7): the panel master buttons and Refresh no longer drop keyboard focus; they use `aria-disabled` and ignore clicks while busy (`components/demo-controls/ControlPanel.tsx`, `components/ui/Button.tsx`). Trade-off: they stay focusable and are announced as unavailable. No open gaps.
- Mobile PDP: Add to cart sits low (about y 996 at 390 px) even with `buriedCta` OFF. Optional `aspect-square lg:aspect-[4/5]` in `components/product/ProductGallery.tsx` would save about 90 px (not applied).
- Not applied by design decision: Designer M6 CR 2 gallery tweak and the optional "Reset to defaults" master button (would need a PLAN section 9 line and a new API action).
- A bare deployment (no `NEXT_PUBLIC_FRICTION_*`, empty store) shows 8 flags ON (baseline). The clean state needs `?friction=all:off` or the panel's All friction OFF.
- Store read-modify-write has no locking: two simultaneous writes could lose one update (not an issue for a single presenter).
- A PIN with a trailing space still unlocks (HTTP header trimming).
- Not verifiable locally: real Upstash latency/behaviour, Vercel CDN `s-maxage` propagation, runtime refusal of `FLAG_STORE=memory` on Vercel (see `DEPLOYMENT.md` checklist).
- `/api/flags` and `FlagsProvider` can make `page_view` arrive up to about 1.5 s after load (`ready` waits for the global fetch, capped at 1.5 s).
