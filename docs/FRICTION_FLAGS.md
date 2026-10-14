# Friction flags

Status: **planned (milestone 4)** for the behaviours and **planned (milestone 6)** for live toggles and the control panel. Spec: `docs/PLAN.md` sections 7 and 9; defaults and phases: `docs/DECISIONS.md`.

Exists today: `lib/config.ts` defines `FlagKey`, `FRICTION` (defaults), `FLAG_META` and the friction target constants. Flags do not change any behaviour yet.

| Flag | Default | Capability | Env var |
|---|---|---|---|
| `promoField` | on | funnel | `NEXT_PUBLIC_FRICTION_PROMO_FIELD` |
| `shippingSurprise` | on | funnel | `NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE` |
| `decoyBanner` | on | heatmaps | `NEXT_PUBLIC_FRICTION_DECOY_BANNER` |
| `buriedCta` | on | heatmaps | `NEXT_PUBLIC_FRICTION_BURIED_CTA` |
| `deadSwatch` | on | replay | `NEXT_PUBLIC_FRICTION_DEAD_SWATCH` |
| `silentSize` | on | replay | `NEXT_PUBLIC_FRICTION_SILENT_SIZE` |
| `slowHero` | on | replay | `NEXT_PUBLIC_FRICTION_SLOW_HERO` |
| `postcodeValidation` | on | errors | `NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION` |
| `expressShippingError` | off | errors | `NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR` |

Planned sections: per-flag behaviour and how it shows up in Contentsquare; resolution order (URL > global store > env > code); control panel; phase workflow (A baseline, B express error, C fixed).
