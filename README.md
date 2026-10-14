# Tidewild demo store

A fictional outdoor/lifestyle e-commerce store (Next.js 16 App Router, TypeScript, Tailwind v4), built to demo Contentsquare funnel analysis, heatmaps/zoning, session replay and error analysis through deliberate, flag-gated UX friction. No real payments.

## Run

```bash
npm install
cp .env.example .env.local   # optional; set DEMO_CONTROLS_PIN for the control panel
npm run dev                  # http://localhost:3000
```

- `npm run lint`, `npm run build`: must pass after every change
- `npm run test:e2e`: Playwright (first run: `npx playwright install chromium`)

## Docs

Start with `docs/PROJECT_STATUS.md`. Then: `docs/PLAN.md` (plan), `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_TOKENS.md`, `docs/FEATURES.md`, `docs/TRACKING.md`, `docs/FRICTION_FLAGS.md`, `docs/DEPLOYMENT.md`, `docs/DEMO_SCRIPT.md`, `docs/TRAFFIC_GUIDE.md`. Original brief: `docs/BRIEF.md`.
