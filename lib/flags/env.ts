// Build-time default layer: NEXT_PUBLIC_FRICTION_<FLAG>.
// Each variable MUST be read with its literal `process.env.NAME` so Next inlines it into the client bundle.
import type { FrictionFlags } from "@/lib/config";

/** Accepts on/off, true/false, 1/0 (case-insensitive). Anything else = unset. */
export function parseToggle(value: string | undefined | null): boolean | undefined {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "on" || v === "true" || v === "1") return true;
  if (v === "off" || v === "false" || v === "0") return false;
  return undefined;
}

const RAW: Record<keyof FrictionFlags, string | undefined> = {
  promoField: process.env.NEXT_PUBLIC_FRICTION_PROMO_FIELD,
  shippingSurprise: process.env.NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE,
  decoyBanner: process.env.NEXT_PUBLIC_FRICTION_DECOY_BANNER,
  buriedCta: process.env.NEXT_PUBLIC_FRICTION_BURIED_CTA,
  deadSwatch: process.env.NEXT_PUBLIC_FRICTION_DEAD_SWATCH,
  silentSize: process.env.NEXT_PUBLIC_FRICTION_SILENT_SIZE,
  slowHero: process.env.NEXT_PUBLIC_FRICTION_SLOW_HERO,
  postcodeValidation: process.env.NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION,
  expressShippingError: process.env.NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR,
};

/** Flags explicitly set through env vars (unset keys are absent). */
export const ENV_FLAGS: Partial<FrictionFlags> = Object.fromEntries(
  Object.entries(RAW)
    .map(([key, raw]) => [key, parseToggle(raw)] as const)
    .filter(([, v]) => v !== undefined),
);
