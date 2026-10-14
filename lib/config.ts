// Central configuration: shop constants, friction flag defaults and metadata.
// Friction behaviour is wired in M4; this file only declares the contract.

// ---------- Shop constants ----------
export const CURRENCY = "EUR" as const;
export const FREE_SHIPPING_THRESHOLD = 75;
export const STANDARD_SHIPPING = 6.95;
export const EXPRESS_SHIPPING = 12.95;
export const PROMO = { code: "DEMO10", rate: 0.1 } as const;
export const MAX_QTY = 10;
export const ORDER_PREFIX = "TW-";

// ---------- Friction targets ----------
export const BURIED_CTA_SLUG = "trailhead-28-backpack";
export const DEAD_SWATCH = { slug: "field-tote", colour: "moss" } as const;
export const SILENT_SIZE_SLUG = "storm-shell-jacket";
export const EXPRESS_ERROR_POSTCODE = /^10/;

export type CountryCode = "NL" | "BE" | "DE" | "FR";
export const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];
export const DEFAULT_COUNTRY: CountryCode = "NL";

// ---------- Friction flags ----------
export type FlagKey =
  | "promoField"
  | "shippingSurprise"
  | "decoyBanner"
  | "buriedCta"
  | "deadSwatch"
  | "silentSize"
  | "slowHero"
  | "postcodeValidation"
  | "expressShippingError";

export type FrictionFlags = Record<FlagKey, boolean>;

export type Capability = "funnel" | "heatmaps" | "replay" | "errors";

export interface FlagMeta {
  key: FlagKey;
  label: string;
  description: string;
  capability: Capability;
  /** Build-time default layer: NEXT_PUBLIC_FRICTION_<FLAG> (on/off). */
  envVar: string;
  /** Contentsquare dynamic variable key (values "on" / "off"). */
  dynamicVarKey: string;
}

/** Code defaults (lowest priority). All ON except expressShippingError. */
export const FRICTION: FrictionFlags = {
  promoField: true,
  shippingSurprise: true,
  decoyBanner: true,
  buriedCta: true,
  deadSwatch: true,
  silentSize: true,
  slowHero: true,
  postcodeValidation: true,
  expressShippingError: false,
};

export const FLAG_META: FlagMeta[] = [
  {
    key: "promoField",
    label: "Prominent promo field",
    description:
      "Cart shows a large, always-open promo code block above the totals.",
    capability: "funnel",
    envVar: "NEXT_PUBLIC_FRICTION_PROMO_FIELD",
    dynamicVarKey: "friction_promo_field",
  },
  {
    key: "shippingSurprise",
    label: "Shipping surprise",
    description:
      "Cart says shipping is calculated at checkout; the cost appears only at checkout.",
    capability: "funnel",
    envVar: "NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE",
    dynamicVarKey: "friction_shipping_surprise",
  },
  {
    key: "decoyBanner",
    label: "Decoy banner",
    description:
      "Product listing pages show a banner that looks clickable but is not.",
    capability: "heatmaps",
    envVar: "NEXT_PUBLIC_FRICTION_DECOY_BANNER",
    dynamicVarKey: "friction_decoy_banner",
  },
  {
    key: "buriedCta",
    label: "Buried Add to cart",
    description:
      "On the Trailhead 28 backpack, Add to cart sits below a long story block.",
    capability: "heatmaps",
    envVar: "NEXT_PUBLIC_FRICTION_BURIED_CTA",
    dynamicVarKey: "friction_buried_cta",
  },
  {
    key: "deadSwatch",
    label: "Dead colour swatch",
    description: "The Moss swatch on the Field tote does nothing when clicked.",
    capability: "replay",
    envVar: "NEXT_PUBLIC_FRICTION_DEAD_SWATCH",
    dynamicVarKey: "friction_dead_swatch",
  },
  {
    key: "silentSize",
    label: "Silent size error",
    description:
      "On the Storm shell jacket, Add to cart without a size does nothing and shows no message.",
    capability: "replay",
    envVar: "NEXT_PUBLIC_FRICTION_SILENT_SIZE",
    dynamicVarKey: "friction_silent_size",
  },
  {
    key: "slowHero",
    label: "Slow hero image",
    description: "The homepage hero image loads slowly and is oversized.",
    capability: "replay",
    envVar: "NEXT_PUBLIC_FRICTION_SLOW_HERO",
    dynamicVarKey: "friction_slow_hero",
  },
  {
    key: "postcodeValidation",
    label: "Strict postcode validation",
    description:
      'Checkout rejects valid postcodes like "1234 AB" with an unhelpful "Invalid input." message.',
    capability: "errors",
    envVar: "NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION",
    dynamicVarKey: "friction_postcode_validation",
  },
  {
    key: "expressShippingError",
    label: "Express shipping error",
    description:
      "Selecting Express with a postcode starting with 10 throws a JavaScript error and blocks payment.",
    capability: "errors",
    envVar: "NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR",
    dynamicVarKey: "friction_express_error",
  },
];

export const FLAG_KEYS: FlagKey[] = FLAG_META.map((m) => m.key);
