// Contentsquare (_uxa) helpers. Guarded: no-ops on the server and when the tag is disabled.
import { hasConsent } from "@/lib/consent";
import type { FlagKey, FrictionFlags } from "@/lib/config";
import { FLAG_META } from "@/lib/config";
import type { FrictionProfile } from "@/lib/flags/resolve";

const RAW_TAG_ID = process.env.NEXT_PUBLIC_CS_TAG_ID || "506730812ef03";

/** Tag id, only when it is a plain alphanumeric id (it ends up in a script URL). */
export const CS_TAG_ID: string | null = /^[A-Za-z0-9]+$/.test(RAW_TAG_ID) ? RAW_TAG_ID : null;
export const CS_ENABLED: boolean = process.env.NEXT_PUBLIC_CS_ENABLED !== "false" && CS_TAG_ID !== null;
export const CS_SRC = CS_TAG_ID ? `https://t.contentsquare.net/uxa/${CS_TAG_ID}.js` : null;

/** Push a command onto the _uxa queue (the tag replays it once loaded). */
export function uxaPush(...command: unknown[]): void {
  if (typeof window === "undefined" || !CS_ENABLED || !hasConsent()) return;
  (window._uxa = window._uxa || []).push(command);
}

export function trackVirtualPageview(path: string): void {
  if (typeof window === "undefined" || !window.__csLoaded) return;
  uxaPush("trackPageview", path);
}

export function trackDynamicVariable(key: string, value: string | number): void {
  uxaPush("trackDynamicVariable", { key, value });
}

export const onOff = (v: boolean) => (v ? "on" : "off");

/** friction_* variables for the effective flags plus friction_profile. */
export function pushFrictionVariables(flags: FrictionFlags, profile: FrictionProfile): void {
  for (const m of FLAG_META) trackDynamicVariable(m.dynamicVarKey, onOff(flags[m.key]));
  trackDynamicVariable("friction_profile", profile);
}

/** Friction state as { promoField: 'on', ... } for the dataLayer page_view. */
export function frictionState(flags: FrictionFlags): Record<FlagKey, "on" | "off"> {
  const out = {} as Record<FlagKey, "on" | "off">;
  for (const m of FLAG_META) out[m.key] = onOff(flags[m.key]);
  return out;
}
