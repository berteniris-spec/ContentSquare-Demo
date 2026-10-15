// Pure flag resolution. Priority (highest first):
// 1. URL / session override  2. global store value  3. env default  4. code default.
import { FLAG_KEYS, FRICTION, type FlagKey, type FrictionFlags } from "@/lib/config";

export type FlagLayer = Partial<FrictionFlags>;
export type FrictionProfile = "baseline" | "express_error" | "fixed" | "clean";

export interface FlagLayers {
  override?: FlagLayer;
  global?: FlagLayer;
  env?: FlagLayer;
  defaults?: FrictionFlags;
}

export function resolveFlags({ override, global, env, defaults = FRICTION }: FlagLayers): FrictionFlags {
  const out = { ...defaults };
  for (const key of FLAG_KEYS) {
    const value = override?.[key] ?? global?.[key] ?? env?.[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function deriveProfile(flags: FrictionFlags): FrictionProfile {
  if (flags.expressShippingError) return "express_error";
  if (FLAG_KEYS.every((k: FlagKey) => !flags[k])) return "clean";
  if (!flags.postcodeValidation) return "fixed";
  return "baseline";
}
