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
- Design tokens: `docs/DESIGN_TOKENS.md`, implemented as the `@theme` in `app/globals.css`. Use only token classes (no hex, no default Tailwind palette, no arbitrary values). The only exception is the SVG renderer. System font stack, light theme only.
- This Next.js version has breaking changes: read `AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code. `cacheComponents` stays off (`next.config.ts`).
- Cart: use `useCart()` / `useCartUi()` from `lib/cart/CartProvider.tsx` (localStorage `tw-cart-v1`). All money maths goes through `lib/pricing.ts`.
- Friction items are intentional and flag-gated (`lib/config.ts`); do not "fix" them.
- Stable `data-testid`s per PLAN section 8 (mobile nav: `mobile-menu-button`, `mobile-nav-link-<slug>`).
- No real payment handling. No third-party imagery; SVG placeholders only.

## Commands
- `npm install && npm run dev`: run locally
- `npm run lint`, `npm run build`: must pass after every change
- `npm run test:e2e`: Playwright e2e (builds and starts on port 3000 with `FLAG_STORE=memory`, `DEMO_CONTROLS_PIN=246810`)
