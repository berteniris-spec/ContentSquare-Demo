# Project brief (source of truth, provided by the owner)

> Verbatim copy of the original brief. Do not edit; record changes and answers in `docs/DECISIONS.md`.

# Build a mock e-commerce demo site (Next.js + Tailwind) with a 5-agent team

## Context
I'm building a demo e-commerce site to show in an interview with Contentsquare. It must feel like a real, polished online store so that analytics have realistic behaviour to analyze. The demo needs to showcase four Contentsquare capabilities: **funnel analysis, heatmaps/zoning, session replay, and error analysis**. It is a demo, so favor simplicity and reliability over feature depth.

## Agent team setup
Before building anything, create five Claude Code subagents as files in `.claude/agents/` (one `.md` file each, with a clear description, a focused system prompt, and only the tools each needs). You (the main session) act as the orchestrator: you delegate to the agents below, relay anything the Planner needs from me, and never skip the Planner.

### 1. Planner (`planner`): everything starts here
- Owns the plan. Before any code is written, it reviews this whole brief and produces a written build plan in `docs/PLAN.md`: milestones, task breakdown per agent, file/folder structure, data model, routes, and acceptance criteria for each page.
- Identifies gaps, ambiguities or risky assumptions in the brief and returns a short list of questions. The orchestrator must ask me these questions (using AskUserQuestion or plain chat) and wait for my answers before the Builder starts. If there are no real questions, say so and proceed. Known topics to confirm: the global flag store for live friction toggles (Vercel Edge Config vs alternative) and the Vercel API token / PIN setup it needs.
- Writes the specific prompt/task for each other agent for each milestone, so hand-offs are clear.
- Re-plans when the Tester or Designer report issues that change scope.

### 2. Builder (`builder`)
- Writes all the code: Next.js (App Router, TypeScript), Tailwind, cart state, tracking helper, friction flags and control panel, product data, SVG product imagery.
- Works strictly from the Planner's tasks, in small milestones, and runs the build and linter after each one.
- Does not decide design questions on its own. If a UX or visual decision is unclear, it asks the Designer via the orchestrator.

### 3. Designer (`designer`)
- Owns UX, CX, UI and accessibility. Reviews the Builder's output after each milestone and either approves it or returns specific, actionable change requests.
- Checks: visual hierarchy, spacing and typography consistency, colour contrast (WCAG AA), keyboard navigation and focus states, semantic HTML, alt text, form labels and error messaging, touch target sizes, mobile responsiveness, clarity of CTAs, and whether the flow feels like a credible, trustworthy store.
- Defines the design tokens (colours, type scale, spacing) early so the Builder uses them consistently.
- Must NOT remove the deliberate friction items listed below. It should confirm they are subtle and realistic, and that the "clean" flag state looks good.

### 4. Tester (`tester`)
- Verifies the site works and nothing is visually broken. After each milestone it runs the build, linter and type checks, and tests the user flows with Playwright (install it as a dev dependency): homepage to PLP to PDP to add to cart to cart to checkout to confirmation.
- Covers: sort dropdown, variant selection, quantity changes, remove from cart, promo code (valid `DEMO10` and invalid), shipping threshold logic, empty cart, checkout validation, order confirmation, cart persistence on reload.
- Checks desktop and mobile viewports and takes screenshots to catch broken layouts.
- Verifies tracking: Contentsquare script requested, virtual page views on route change, and data layer events firing with the right payloads.
- Verifies each friction flag works when ON and is fully gone when OFF, and verifies the live toggle behaviour described in "Live friction toggles".
- Reports results as a pass/fail list with reproduction steps, saved to `docs/TEST_REPORT.md`. Does not fix code itself; it sends issues back via the orchestrator to the Builder.

### 5. Documenter (`documenter`)
- Keeps documentation current so I can jump back into any session quickly. Updates after every milestone, not just at the end.
- Maintains in `docs/`:
  - `PROJECT_STATUS.md`: what is done, in progress, blocked, and next steps. Always put the latest state at the top, with a dated change log below.
  - `ARCHITECTURE.md`: folder structure, key components, state management, data flow.
  - `FEATURES.md`: every functional element (pages, cart, promo logic, shipping rules, checkout flow, tracking events), with how it works and where the code lives.
  - `TRACKING.md`: Contentsquare tag setup, env vars, virtual page views, dynamic variables, full data layer event list with payload examples.
  - `FRICTION_FLAGS.md`: each deliberate UX issue, its flag name, which Contentsquare capability it demonstrates, how it would show up in the platform, plus the control panel, flag resolution order, env vars and phase workflow.
  - `DEPLOYMENT.md`: Vercel deploy steps, env vars, Edge Config setup, and Contentsquare domain allow-listing.
  - `DEMO_SCRIPT.md`: suggested walkthrough for the interview, organised by the four capabilities (funnels, heatmaps, replay, errors).
  - `TRAFFIC_GUIDE.md`: guide for generating realistic traffic (setup checks, session variety, target funnel shape, personas, phases, session log, pre-interview checklist). I will provide its content; if I have not, write it from the "Traffic guide requirements" section below.
  - `DECISIONS.md`: key decisions and why they were made (including answers I gave the Planner).
- Also maintains a concise root `README.md` (how to run, where the docs live) and a `CLAUDE.md` file with the project summary, conventions, commands, and "read docs/PROJECT_STATUS.md first" so any new session resumes with full context.

### Workflow loop
1. Planner reviews the brief, asks me questions (via the orchestrator), then writes `docs/PLAN.md`.
2. For each milestone: Builder builds, then Designer reviews, then Tester tests, then Documenter updates docs.
3. Any issues from Designer or Tester go back to the Builder, then re-review. A milestone is done only when Designer and Tester both pass it.
4. **Run end to end:** do not pause for my approval between milestones. Only stop for (a) the Planner's questions, (b) decisions that change scope, or (c) something that needs me to act manually. Give me one final summary at the end.

## Brand and products
- Invent a fictional outdoor/lifestyle brand. Choose an original name, logo wordmark (text-based is fine), and tagline. Do not use any real brand's name, logo, copy, or imagery.
- Catalog: about 24 products across 3 categories (for example Bags, Apparel, Accessories). Store them in a local JSON/TS file with: id, slug, name, category, price (EUR), description, 3-4 feature bullets, colour options, sizes where relevant, stock status, and images.
- **Imagery:** use original, generated SVG placeholders only (clean illustrated product silhouettes in the brand palette, with colour variants and 3-4 view variations per product). No photos, no scraped or third-party images.

## Design direction
- Take general inspiration from the clean, minimal, premium feel of modern bag and lifestyle brands such as Bellroy: generous whitespace, calm neutral palette with one accent colour, large product imagery, simple sans-serif typography.
- Do NOT copy any specific layout, copy, icons, imagery, or branding from bellroy.com or any other real site. Everything must be original.
- Responsive (mobile-first), accessible (semantic HTML, alt text, keyboard focus states).

## Pages and routes (keep these URLs exactly, for Contentsquare page-group mapping)
| Page | Route |
|---|---|
| Homepage | `/` |
| PLP | `/category/[category-slug]` (plus `/category/all`) |
| PDP | `/product/[product-slug]` |
| Cart | `/cart` |
| Checkout | `/checkout` |
| Order confirmation | `/confirmation` |

### Homepage
Hero banner with CTA, category tiles linking to the PLPs, a "Featured / Bestsellers" product row, a short brand-values strip, a newsletter signup (non-functional, shows a thank-you state), header with logo, category nav, and cart icon with live item count, and a footer.

### PLP (keep it simple)
Title, product count, a grid of product cards (image, name, price, colour count), and a single sort dropdown (Featured, Price low-high, Price high-low). No filters, no pagination. Each card links to its PDP.

### PDP
Image gallery (3-4 images with thumbnails), name, price, colour swatches, size selector where relevant, quantity selector, "Add to cart" button, description, feature bullets, and a "You may also like" row. Add to cart updates the header count and opens a mini-cart drawer or toast.

### Cart
Line items with image, name, variant, quantity stepper, remove, and line total. Order summary with subtotal, a flat shipping rule (free over EUR 75, else EUR 6.95), and total. A promo code field (accept `DEMO10` for 10% off; show an error for anything else). "Proceed to checkout" button and an empty-cart state.

### Checkout (demo, completes the purchase)
Single-page checkout: contact email, shipping address, shipping method (Standard / Express), and payment (card number, expiry, CVC). **No real payment processing and no real card data handling.** Accept any well-formed input, and show a visible banner: "Demo store: no real payment is taken. Use any test details, e.g. 4242 4242 4242 4242." On submit, show a short processing state, then redirect to `/confirmation` with an order number, order summary, and a "Continue shopping" button. Clear the cart afterwards.

## State
Persist cart in localStorage via a small context/store. No backend or database is needed for the shop itself. Use client-side state only (the friction flag store described below is the only server-side state).

## Contentsquare readiness
1. **Contentsquare tag:** in `app/layout.tsx`, load the Contentsquare script with `next/script` using `strategy="afterInteractive"`:
   - Script URL: `https://t.contentsquare.net/uxa/506730812ef03.js`
   - Read the tag ID from an env var `NEXT_PUBLIC_CS_TAG_ID`, defaulting to `506730812ef03`, and build the URL from it.
   - Add a `NEXT_PUBLIC_CS_ENABLED` flag (default `true`) so I can switch tracking off locally.
   - Because this is a Next.js app with client-side navigation, send a virtual page view on every route change using `window._uxa.push(['trackPageview', pathname + search])`, guarded so it only runs once the script has loaded.
   - For purchases, also push the transaction to Contentsquare with `window._uxa.push(['trackDynamicVariable', { key: 'order_value', value: <total> }])` on `/confirmation`, alongside the data layer `purchase` event.
   - Do not load the tag on `/demo-controls`.
2. **Data layer:** create `window.dataLayer`-style pushes (or a small `track()` helper) for: `page_view` (with page type and current friction state), `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase` (with transaction id, value, currency, items). Also expose page type via `data-page-type` on `<body>`.
3. **Stable selectors:** give key elements meaningful `data-testid`/`id` attributes (add-to-cart, checkout submit, promo code field, nav links) so they are easy to find in zone-based heatmaps.
4. **Clean URLs:** use the route structure above, no query-string noise except `?sort=` (and the `?friction=` override described below).

## Deliberate UX friction (for demo storytelling)
Add these subtle, realistic issues, grouped by the Contentsquare capability they demonstrate. They are intentional, so the Designer and Tester must not "fix" them while their flag is ON. Each one is toggleable with a single flag in `lib/config.ts` (e.g. `FRICTION.promoField`) so I can switch to a "clean" version.

**Funnel analysis (visible drop-off between steps)**
- `promoField`: a visually prominent promo code field on the cart page that sends users hunting for codes and leaving.
- `shippingSurprise`: shipping cost only appears at checkout for orders under the free-shipping threshold (not shown in cart), creating a drop-off at the checkout step.

**Heatmaps / zoning (clicks and scroll behaviour)**
- `decoyBanner`: a bright promotional strip on the PLP that looks clickable but is not a link, attracting clicks with no result.
- `buriedCta`: on one PDP, push the "Add to cart" button below a long block of content so scroll depth and click zones tell a story on mobile.

**Session replay (frustration signals)**
- `deadSwatch`: on one PDP, a colour swatch that looks selectable but does nothing for one specific colour, causing repeated clicks (rage clicks).
- `silentSize`: on one product (e.g. a jacket) "Add to cart" silently does nothing if no size is chosen, with no error message.
- `slowHero`: one slow-loading, oversized hero image on the homepage.

**Error analysis (JS and validation errors tied to revenue)**
- `postcodeValidation`: an overly strict postcode field that rejects valid formats on first attempt with an unhelpful error message.
- `expressShippingError`: selecting "Express" shipping with a specific postcode pattern throws an uncaught JavaScript error (visible in the console and in Contentsquare's error analysis) and leaves the Pay button unresponsive until the user changes the shipping method. This flag must be switchable live, without a redeploy (see "Live friction toggles").

## Live friction toggles
I need to turn every friction flag on and off during and between demos, including `expressShippingError`, without redeploying.

1. **Flag resolution order** (highest priority first):
   1. URL override for the current browser, e.g. `?friction=expressShippingError:off,promoField:on` (stored in sessionStorage for that browser session)
   2. Global live setting for all visitors (see 3)
   3. Environment variable default (`NEXT_PUBLIC_FRICTION_<FLAG>`)
   4. Default in `lib/config.ts`
2. **Demo control panel** at `/demo-controls`:
   - Not linked anywhere in the site, protected by a simple PIN from env var `DEMO_CONTROLS_PIN`.
   - Lists every friction flag with an ON/OFF switch, a one-line description, and which Contentsquare capability it demonstrates.
   - Has master buttons: "All friction ON", "All friction OFF", and "Only fix errors" (turns off `expressShippingError` and `postcodeValidation`, leaves the rest on).
   - Shows the current state and the time each flag was last changed.
   - Must be excluded from tracking: do not load the Contentsquare tag on this route, and add `noindex`.
3. **Global state for all visitors:** store the flag values in Vercel Edge Config (free tier) and read them through a small `/api/flags` route (no caching for the panel, short cache for visitors). The control panel writes to Edge Config through a PIN-protected API route using the Vercel API token stored as an env var. The Planner must confirm this approach with me, and if Edge Config is awkward, propose the simplest alternative (e.g. Vercel KV/Upstash Redis). If the global store is not configured, fall back gracefully to env vars and URL overrides so the site never breaks.
4. **Tracking the state:** send the current friction state to Contentsquare as dynamic variables on each page load, e.g. `friction_express_error = on|off` and `friction_profile = baseline|express_error|fixed`, so I can segment sessions by phase in the platform. Also add it to the data layer `page_view` event.
5. **Change log:** the control panel records each toggle change with a timestamp in a `flagHistory` list (stored with the flags) so I can line up phases with Contentsquare date ranges. Show the last 20 changes in the panel.
6. **Testing:** the Tester must verify that flipping `expressShippingError` takes effect for a new visitor within 60 seconds of the change, that OFF fully removes the error, and that the control panel and API reject a wrong PIN.
7. **Documentation:** the Documenter adds the control panel, flag resolution order, env vars and the phase workflow to `FRICTION_FLAGS.md` and `DEPLOYMENT.md`.

## Deployment (Vercel)
- Must deploy to Vercel with no special configuration beyond env vars and Edge Config. Provide a `DEPLOYMENT.md` with step by step instructions: push to GitHub, import into Vercel, create the Edge Config store, set env vars (`NEXT_PUBLIC_CS_TAG_ID`, `NEXT_PUBLIC_CS_ENABLED`, `DEMO_CONTROLS_PIN`, the Edge Config connection string, the Vercel API token, and optional `NEXT_PUBLIC_FRICTION_<FLAG>` defaults), deploy.
- Remind me to add the final Vercel domain in the Contentsquare project settings so sessions are collected.

## Traffic guide requirements (for `docs/TRAFFIC_GUIDE.md`)
Cover: setup checks (domain allow-listed, tag request visible, internal IP filtering, cookie consent); how to make sessions look like different people (fresh incognito windows, mixed devices and browsers, mixed entry points and UTM parameters, varied session lengths, friends and family on real phones); a target funnel shape out of 100 sessions (about 100 landed, 65 PLP, 45 PDP, 20 add to cart, 15 cart, 9 checkout, 4-5 purchases); three phases for a before/after story (A baseline with all friction ON, B express error spike, C fixed) with the time of each flag switch noted; personas with shares (bouncer 25%, browser 20%, promo hunter 10%, rage clicker 8%, silent size 7%, mobile scroller 10%, postcode struggler 5%, express error victim 5%, happy buyer 10%) and what each demonstrates; tips for natural behaviour; optional headed Playwright traffic scripts with caveats about bot filtering; a session log template; and a pre-interview sanity checklist (funnel drop-offs, replays with rage clicks, error analysis entries, heatmaps with enough clicks, bookmarked views, baseline vs post-fix conversion numbers).

## Technical requirements
- Next.js (App Router, TypeScript) and Tailwind CSS. No heavy UI libraries.
- Static product data, `generateStaticParams` for PLP/PDP routes.
- Clean component structure (Header, Footer, ProductCard, CartDrawer, etc.).
- Lint clean, builds without errors, and runs with `npm install && npm run dev`.

## Kickoff instructions
1. Create the five agent files in `.claude/agents/` and a starter `CLAUDE.md`.
2. Invoke the Planner first. Relay its questions to me and wait for my answers.
3. Once the plan is approved, run the full milestone loop end to end (Builder, Designer, Tester, Documenter) until all pages and the control panel are complete.
4. Finish with a brief summary, the final test report, and anything I need to do manually (such as pushing to GitHub, deploying to Vercel, creating the Edge Config store, and allow-listing my deployed domain in the Contentsquare project settings).
