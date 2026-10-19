# CLAUDE.md

**Read `docs/PROJECT_STATUS.md` first** for the current state and next steps.

## Project
Tidewild: a fictional outdoor/lifestyle e-commerce demo store (Next.js 16.4 App Router, React 19.3, TypeScript, Tailwind v4) built for a Contentsquare interview. It showcases funnel analysis, heatmaps/zoning, session replay and error analysis, using deliberate, flag-gated UX friction. Original brief: `docs/BRIEF.md`. Plan: `docs/PLAN.md`. Decisions: `docs/DECISIONS.md`. Code map: `docs/ARCHITECTURE.md`.

## Agent team (`.claude/agents/`)
The main session orchestrates: planner -> (per milestone) builder -> designer -> tester -> documenter. Never skip the planner. A milestone is done only when the designer and the tester both pass it.
- If the named agents are not registered (session started outside the repo), run each role as a general-purpose subagent that reads and follows its role file (see DECISIONS).
- Designer and Tester must not run `next start` at the same time: `npm run test:e2e` rebuilds `.next/`.

## Conventions
- Keep the routes exactly: `/`, `/category/[slug]` (+ `/category/all`), `/product/[slug]`, `/cart`, `/checkout`, `/confirmation`, `/demo-controls`.
- Design tokens: `docs/DESIGN_TOKENS.md`, implemented as the `@theme` in `app/globals.css`. Use only token classes (no hex, no default Tailwind palette, no arbitrary values; use the `xs` breakpoint, not `min-[360px]:`). The only exception is the SVG renderer. System font stack, light theme only.
- This Next.js version has breaking changes: read `AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code. `cacheComponents` stays off (`next.config.ts`).
- Cart: use `useCart()` / `useCartUi()` from `lib/cart/CartProvider.tsx` (localStorage `tw-cart-v1`). All money maths goes through `lib/pricing.ts`. Last order: sessionStorage `tw-last-order` (`lib/order.ts`); checkout validation: `lib/checkout/validation.ts`.
- Consent: only GA4 loads after Accept in the cookie banner (`lib/consent.ts`, localStorage `tw-consent`, `components/layout/CookieBanner.tsx`; `track()`/GA helpers no-op without consent). The Contentsquare tag and `uxa` pushes load for every visitor with no consent (installation check; DECISIONS 2026-10-19). Neither on `/demo-controls`. Security headers incl. an enforced loose CSP live in `next.config.ts`; a new third-party host needs a CSP entry.
- Consent URL param: `?consent=accept|decline|reset` is handled by `applyConsentParam()` in `lib/consent.ts` (once on mount in `CookieBanner`; invalid ignored; param stripped, others kept; not on `/demo-controls`). Demo links: `/?consent=accept&friction=all:off`. Demo site: test orders are intentionally recorded as real data.
- Tracking: use `track*` helpers in `lib/tracking/track.ts` and `uxa.ts`; never add a manual GA `page_view`; no PII in pushes; no tags on `/demo-controls`. See `docs/TRACKING.md`.
- Flags resolve override > global (store via `/api/flags`) > env > defaults (`lib/flags/`). Control panel `/demo-controls` uses `DEMO_CONTROLS_PIN` via header `x-demo-pin`; `FLAG_STORE=memory` is refused on Vercel. Never put a real PIN or Upstash token in the repo or docs.
- Friction items are intentional and flag-gated (`lib/config.ts`); do not "fix" them.
- Stable `data-testid`s per PLAN section 8 (mobile nav: `mobile-menu-button`, `mobile-nav-link-<slug>`).
- No real payment handling. No third-party imagery; SVG placeholders only.

## Commands
- `npm install && npm run dev`: run locally
- `npm run lint`, `npm run build`: must pass after every change
- `npm run test:m6`: control-panel suite (`playwright.m6.config.ts`, `tests-panel/`; builds once, starts five servers; sets `FLAG_STORE` explicitly so the real Upstash store is never touched). Do not run together with `test:e2e`.
- `npm run test:e2e`: Playwright e2e (builds and starts on port 3000 with `FLAG_STORE=memory`, `DEMO_CONTROLS_PIN=246810`)
- `npm run test:variants`: runs `tests-variants/` four times (`VARIANT=disabled|override|invalid|dev`); also rebuilds `.next/`
- `npm run test:defaults`: shipped default state with no `NEXT_PUBLIC_FRICTION_*` set (`playwright.defaults.config.ts`, `tests-defaults/`, port 3300, memory store)
- Traffic generator: `npm run traffic` (`scripts/traffic/`; `--live` required for non-localhost; see `docs/TRAFFIC_GUIDE.md` section 9).
- Run the Playwright suites one at a time (each rebuilds `.next/`). Last full run (consent + security headers): main 529/0/13, panel 74/0/2, variants 8 passed + 2 skipped each (dev 10 passed), defaults 18; lint 0 warnings. All Playwright configs seed `tw-consent=accepted` via `tests/consent-state.ts`; `tests/consent.spec.ts` clears it to test the banner.

## Friction flags
Eight of nine flags are ON by default (baseline); the clean state needs `?friction=all:off` or the panel's All friction OFF. Read flags only with `useFlag(key)` / `useFlags()` from `lib/flags/FlagsProvider.tsx`. Override in the browser with `?friction=flag:on,flag:off` (`all:on|off`, `reset`). The e2e server sets all `NEXT_PUBLIC_FRICTION_*` to `off`; friction tests use `?friction=`. See `docs/FRICTION_FLAGS.md`.

## Deployment
https://tidewild-demo.vercel.app (GitHub-linked, pushes auto-deploy; manual: `vercel deploy --prod --yes`). Production runs the M3 build until the owner commits and deploys M4-M7. See `docs/DEPLOYMENT.md`; owner steps in `docs/PROJECT_STATUS.md`.

## Docs
Start with `docs/PROJECT_STATUS.md` (all milestones M1-M7 done). Then: `docs/DEMO_SCRIPT.md`, `docs/TRAFFIC_GUIDE.md`, `docs/DEPLOYMENT.md`, `docs/FRICTION_FLAGS.md`, `docs/TRACKING.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PLAN.md`, `docs/DESIGN_TOKENS.md`. Original brief: `docs/BRIEF.md`.
