# Deployment

Status: **Vercel project live (2026-10-14), but production still runs the M3 build.** M4 (friction flags), M5 (tracking, GA), M6 (live toggles, control panel) and M7 (polish, final docs) are built and tested locally but **not deployed**: nothing has been committed or pushed since `64797dc`. The Upstash store is provisioned but nothing reads it in production until the deploy below.

## Current setup

| Item | Value |
|---|---|
| Vercel project | `tidewild-demo` (lowercase is required; the folder name `ContentSquare-Demo` has capitals) |
| Team / scope | `berteniris-spec` |
| Project id | `prj_ljR1blnrWquaM8KJ2NqnChAsByZy` |
| Git link | GitHub `berteniris-spec/ContentSquare-Demo`; pushes auto-deploy |
| Production URL | https://tidewild-demo.vercel.app |
| Latest prod deployment | `dpl_7mciSSnxwS96iDzG5gmHPndgTEqf` (Next.js 16.4.0, build about 10 s) |
| Local link files | `.vercel/` and `.env.local` (both gitignored) |

The first deploy was auto-assigned to production; later non-production deploys are previews.

## Setup steps (as done)

1. Link: `vercel link --yes --project tidewild-demo`.
2. Turn off deployment protection (see below).
3. Add env vars (see below), then redeploy.
4. Provision Upstash for Redis (see below).
5. Deploy: `vercel deploy --prod --yes`.

Use the Vercel CLI for project settings. The Vercel MCP token has no access to the `berteniris-spec` scope (403). `.claude/settings.local.json` (gitignored) allows `vercel env add` and the MCP `update_project` tool for Claude Code.

## Deployment protection (important)

Vercel Authentication (SSO protection) is ON by default for new projects. It blocks visitors and the Contentsquare tag. It was turned off with:

```bash
vercel project protection disable tidewild-demo --sso
vercel project protection          # check the current state
```

The dashboard may not show this setting; the CLI works.

## Environment variables

Set on **Production**:

| Name | Value / note |
|---|---|
| `DEMO_CONTROLS_PIN` | Sensitive, 8 digits. Not recorded in the repo; the owner holds it. |
| `NEXT_PUBLIC_CS_TAG_ID` | `506730812ef03` |
| `NEXT_PUBLIC_CS_ENABLED` | `true` |
| `FLAG_STORE` | Left **unset**: auto-detects Upstash. `memory` is refused on Vercel. |

Added by the Upstash integration (Production, Preview, Development): `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL`.

### Tracking env vars (build time)

The app now has Google Analytics and Contentsquare tag configuration. All are `NEXT_PUBLIC_*`, inlined at build, so **a redeploy is needed for any change**.

| Name | Default if unset | Note |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-4PLJ26X0Y9` | GA4 measurement id; invalid value turns GA off |
| `NEXT_PUBLIC_GA_ENABLED` | `true` | `false` disables GA completely |
| `NEXT_PUBLIC_CS_TAG_ID` | `506730812ef03` | already set on Production |
| `NEXT_PUBLIC_CS_ENABLED` | `true` | already set on Production |

The GA vars are not set on Vercel yet; the defaults apply, which is what the demo wants. Use `NEXT_PUBLIC_GA_ENABLED=false` in `.env.local` for local work.

Add or change a variable with `vercel env add NAME production`. Env changes apply only to **new** deployments, so redeploy afterwards. `.env.example` lists the variables the app reads.

## Flag store (Upstash for Redis)

Provisioned with `vercel integration add upstash/upstash-kv` (accept the terms in the browser first). Resource `upstash-kv-camel-park`, connected to the project; it injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (plus read-only token, `KV_URL`, `REDIS_URL`) into Production, Preview and Development. Code: `lib/flags/store/*`; it talks to the REST API with plain `fetch` (`{url}/get/...`, `POST {url}/set/...`, Bearer token, 1500 ms timeout) and keeps everything under the key `tw:friction`. No extra setup is needed.

Store selection (`getStore()` in `lib/flags/store/index.ts`), first match wins:

| `FLAG_STORE` | Result |
|---|---|
| `none` | no store |
| `memory` | in-process memory store (local/e2e only; **refused, i.e. no store, when `VERCEL` is set**) |
| `upstash` | Upstash if credentials exist, else no store |
| empty / unknown | auto: `KV_REST_API_*` or `UPSTASH_REDIS_REST_*` present -> Upstash, else no store |

Leave `FLAG_STORE` **unset** on Vercel. Locally, `.env.local` normally has no store (panel shows "not configured"); use `FLAG_STORE=memory` for a local demo of the panel. Do not point local dev at the production Upstash store unless you intend to change live flags.

Control panel PIN: `DEMO_CONTROLS_PIN` (Production, sensitive, 6+ digits, held by the owner; never commit it). Unset = panel and write API disabled (503 `pin_not_configured`). Entered on `/demo-controls`, sent as header `x-demo-pin`; wrong PIN gets 401 after about 500 ms.

When the store is unconfigured or unreachable the shop still works: `GET /api/flags` answers 200 with `configured:false` (or `error:true`), the global layer is empty and flags fall back to env then code defaults (`FRICTION_FLAGS.md`). The panel shows the problem (503 `store_not_configured`, 502 `store_error`) and cannot change flags.

The integration also added untracked `.agents/`, `.claude/skills/` and `skills-lock.json` (Upstash agent skills, not part of the store). The owner decides whether to commit or delete them.

## Deploying M4-M7

Prerequisites locally (last run, all green): `npm run lint` (0 warnings), `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` (499 passed / 0 failed / 7 skipped), `npm run test:m6` (74/0/2), `npm run test:variants` (disabled, override, invalid: 8 passed + 2 skipped each; dev Strict Mode 10 passed), `npm run test:defaults` (18 passed). Run them one at a time (each rebuilds `.next/`).

1. Review `git status`; decide on untracked `.agents/`, `.claude/skills/`, `skills-lock.json` (Upstash agent skills). Note `.gitignore` has a new `.claude/settings.local.json` line. Do not commit `.env.local`, `.vercel/` or any file containing the PIN.
2. Commit the M4-M7 work.
3. Push to the GitHub-linked branch (auto-deploys to production), or run `vercel deploy --prod --yes`.
4. In Vercel, confirm Production has `DEMO_CONTROLS_PIN`, `NEXT_PUBLIC_CS_TAG_ID`, `NEXT_PUBLIC_CS_ENABLED`, the Upstash `KV_*` vars, and **no** `FLAG_STORE=memory`.
5. Decide the baseline: with no `NEXT_PUBLIC_FRICTION_*` set (the default), a bare deployment shows **8 flags ON** (profile `baseline`, `expressShippingError` OFF) until the panel sets values. The clean state exists only when asked for explicitly (`?friction=all:off` or the panel's **All friction OFF**). Changing env defaults needs a redeploy; panel changes do not.
6. Allow-list the domain in Contentsquare (next section).
7. Run the checklist "After the production deploy" below.

## Contentsquare domain allow-listing (reminder)

In the Contentsquare project settings, allow-list the production domain **`tidewild-demo.vercel.app`** (and any custom domain or preview domain you demo from). Without it the tag will not collect data from production. Also check the project's privacy settings; the site has a consent banner and the tag only loads after Accept (see `TRAFFIC_GUIDE.md`).

## Smoke check

```bash
curl -s -o /dev/null -w "%{http_code}" https://tidewild-demo.vercel.app/<path>
```

`/`, `/demo-controls`, `/product/field-tote` and `/cart` returned 200 on 2026-10-14. `/demo-controls` currently shows "not available yet" (M3 build); after the M4-M7 deploy it shows the PIN form.

## After the production deploy (manual checks)

Tests use stubs, a memory store and a fake unreachable Upstash URL, so these can only be verified on a real deployment.

Smoke: `/`, `/demo-controls`, `/api/flags`, `/api/hero-image` return 200; `/demo-controls` now shows the PIN form (no longer "not available yet").

Flag store (M6):
1. **Real store**: open `/demo-controls`, enter the PIN; status must say Upstash (not memory/not configured). Toggle a flag, press Refresh: it persists; history shows the entry. Check latency feels acceptable (timeout is 1.5 s).
2. **CDN propagation**: `curl -s https://tidewild-demo.vercel.app/api/flags` after a flip. Expect `Cache-Control: public, max-age=0, s-maxage=10, stale-while-revalidate=20` and the new value within about 60 s for a new visitor (check `x-vercel-cache`). Then confirm a fresh incognito window shows the changed behaviour (for example `expressShippingError` ON -> checkout error with a `10xxx` postcode and Express).
3. **Memory refusal**: confirm `FLAG_STORE` is not `memory` in Production env (`vercel env ls`). The runtime refusal of `memory` on Vercel is covered locally only by simulating `VERCEL=1`.
4. **Wrong/missing PIN**: panel shows "Wrong PIN" (about 0.5 s delay). The API must answer 401 without the header.
5. After the check, set the flags back to Phase A (see `FRICTION_FLAGS.md`).

Security headers and consent (new, not yet verified live):
1. **CSP**: open the live site with DevTools, click Accept, and check the console for "Content Security Policy" / "violates the following directive" errors. The CSP (`next.config.ts`) is enforced and deliberately loose; if the real GA or Contentsquare tag (or its collectors) is blocked, add the host to `script-src` / `connect-src`.
2. **Tags after Accept**: before Accept, Network shows no `googletagmanager.com` or `contentsquare` requests; after Accept both load and `window._uxa` / `dataLayer` fill. After Decline, nothing loads.
3. **Headers**: `curl -sI https://tidewild-demo.vercel.app/` shows `x-content-type-options`, `referrer-policy`, `x-frame-options: DENY`, `permissions-policy`, `strict-transport-security`, `content-security-policy`; `/api/flags` still has its own `Cache-Control`.
4. `/demo-controls` has no banner and no tags.

Tracking (M5):
1. **GA4** (click Accept first): open Realtime and DebugView for property `G-4PLJ26X0Y9`. Hard loads and SPA navigations should each show one page view (no doubles); a test purchase should appear once. `/demo-controls` sends nothing by design.
2. **Contentsquare**: after allow-listing `tidewild-demo.vercel.app`, confirm the tag loads (`t.contentsquare.net/uxa/506730812ef03.js`), consumes `_uxa` (virtual page views on route changes, `friction_*` and `order_value` dynamic variables).
3. `?friction=` overrides work on the live URL.
4. **Panel API not cached**: `curl -i -H "x-demo-pin: <PIN>" https://tidewild-demo.vercel.app/api/demo-controls/flags` must not be served from the CDN (no `x-vercel-cache: HIT`), and a toggle then Refresh in the panel shows the new value immediately.
5. **Hero weight**: `/api/hero-image` returns about 1.73 MB after about 3 s on Vercel with `slowHero` ON (`Cache-Control: no-store`), and is not requested at all with `?friction=slowHero:off`. Check it stays within the serverless time limit.
6. **Contentsquare variables**: in a recorded session or the Contentsquare data check, `friction_*` and `order_value` appear for a test purchase.

Finally, leave the flags in the state you want (Phase A: `expressShippingError` OFF, others ON; the panel's phase line confirms) and Lock the panel.
