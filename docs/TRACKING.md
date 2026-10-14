# Tracking

Status: **planned (milestone 5)**. The contract is in `docs/PLAN.md` section 8.

Exists today:
- `.env.example`: `NEXT_PUBLIC_CS_TAG_ID` (default `506730812ef03`), `NEXT_PUBLIC_CS_ENABLED`.
- `types/global.d.ts`: `window._uxa`, `window.__csLoaded`, `window.dataLayer`.
- `lib/config.ts` `FLAG_META[].dynamicVarKey`: the dynamic variable names (`friction_*`).
- Playwright fixture stubs `t.contentsquare.net` and records the requests.

Planned sections:
- Contentsquare tag setup and env vars
- Virtual page views on route change
- Dynamic variables (`friction_*`, `friction_profile`, `order_value`)
- Data layer events with example payloads (`page_view`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`)
- `data-page-type` and stable `data-testid` selectors
