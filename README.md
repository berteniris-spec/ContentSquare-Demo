# Tidewild demo store

A fictional outdoor/lifestyle e-commerce store (Next.js 16 App Router, React 19, TypeScript, Tailwind v4), built to demo Contentsquare funnel analysis, heatmaps/zoning, session replay and error analysis through deliberate, flag-gated UX friction. No real payments, SVG imagery only.

Live: https://tidewild-demo.vercel.app (production still runs the M3 build until the owner commits and deploys M4-M7; see `docs/PROJECT_STATUS.md`).

## Run

```bash
npm install
cp .env.example .env.local   # optional; DEMO_CONTROLS_PIN + FLAG_STORE=memory enable the control panel locally
npm run dev                  # http://localhost:3000
```

Tip: set `NEXT_PUBLIC_GA_ENABLED=false` in `.env.local` so localhost does not hit the real GA4 property.

## Commands

| Command | What |
|---|---|
| `npm run lint`, `npm run build` | must pass after every change |
| `npm run test:e2e` | main Playwright suite (builds, port 3000, `FLAG_STORE=memory`, PIN `246810`) |
| `npm run test:m6` | control panel / live toggles (`tests-panel/`, own config) |
| `npm run test:variants` | tracking build variants: disabled / override / invalid / dev Strict Mode (`tests-variants/`) |
| `npm run test:defaults` | shipped default state with no friction env set (`tests-defaults/`, port 3300) |

First Playwright run: `npx playwright install chromium`. Run the suites one at a time; each rebuilds `.next/`. Tests never touch the real flag store.

## Consent

Contentsquare loads for every visitor with no consent (so its installation check passes); GA4 loads only after the visitor clicks Accept in the cookie banner (`lib/consent.ts`); `?consent=accept|decline|reset` sets the GA choice from a link (demo helper, e.g. `/?consent=accept&friction=all:off`). This is a demo site: sessions and test orders are intentionally recorded as real data. See `docs/TRACKING.md`.

## Friction flags

Nine flags; eight are ON by default (baseline), `expressShippingError` is OFF. Override per tab with `?friction=flag:on,flag:off` (also `all:on`, `all:off`, `reset`). Live global toggles for all visitors: `/demo-controls` with `DEMO_CONTROLS_PIN` (Upstash on Vercel, `FLAG_STORE=memory` locally). The clean state needs `?friction=all:off` or the panel's All friction OFF.

## Docs (start with `docs/PROJECT_STATUS.md`)

`PROJECT_STATUS` (state, next steps, owner manual steps) | `DEMO_SCRIPT` (interview run order) | `TRAFFIC_GUIDE` (generating sessions, privacy) | `DEPLOYMENT` (Vercel, env, Contentsquare project settings) | `FRICTION_FLAGS` | `TRACKING` | `FEATURES` | `ARCHITECTURE` | `DECISIONS` | `PLAN` | `DESIGN_TOKENS` | `DESIGN_REVIEW` | `TEST_REPORT` | `BRIEF` (original brief).
