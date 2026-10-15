// Per-browser-session overrides from `?friction=flagA:on,flagB:off` (also `all:on`, `all:off`, `reset`).
// Persisted in sessionStorage; the URL parameter is never rewritten.
import { FLAG_KEYS, type FlagKey } from "@/lib/config";
import { parseToggle } from "./env";
import type { FlagLayer } from "./resolve";

export const OVERRIDES_STORAGE_KEY = "tw-friction-overrides";
export const OVERRIDE_PARAM = "friction";

const EMPTY: FlagLayer = Object.freeze({});
const normalise = (s: string) => s.toLowerCase().replace(/[-_]/g, "");
const KEY_BY_NAME = new Map<string, FlagKey>(FLAG_KEYS.map((k) => [normalise(k), k]));

/** Apply the operations in a `friction` param on top of `base`. Unknown keys/values are ignored. */
export function applyOverrideParam(param: string | null | undefined, base: FlagLayer = EMPTY): FlagLayer {
  let next: FlagLayer = { ...base };
  for (const part of (param ?? "").split(",")) {
    const [rawName, rawValue] = part.split(":").map((s) => s.trim());
    if (!rawName) continue;
    if (normalise(rawName) === "reset" && rawValue === undefined) {
      next = {};
      continue;
    }
    const value = parseToggle(rawValue);
    if (value === undefined) continue;
    if (normalise(rawName) === "all") {
      for (const k of FLAG_KEYS) next[k] = value;
      continue;
    }
    const key = KEY_BY_NAME.get(normalise(rawName));
    if (key) next[key] = value;
  }
  return next;
}

function readStored(): FlagLayer {
  try {
    const raw = window.sessionStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: FlagLayer = {};
    for (const k of FLAG_KEYS) if (typeof parsed[k] === "boolean") out[k] = parsed[k];
    return out;
  } catch {
    return EMPTY;
  }
}

function sameLayer(a: FlagLayer, b: FlagLayer): boolean {
  return FLAG_KEYS.every((k) => a[k] === b[k]);
}

let cached: FlagLayer = EMPTY;
const listeners = new Set<() => void>();

/** Stored overrides with the current URL param applied on top. Referentially stable while unchanged. */
export function getOverridesSnapshot(): FlagLayer {
  const param = new URLSearchParams(window.location.search).get(OVERRIDE_PARAM);
  const next = param === null ? readStored() : applyOverrideParam(param, readStored());
  if (!sameLayer(cached, next)) cached = next;
  return cached;
}

export const SERVER_OVERRIDES: FlagLayer = EMPTY;

/** Write the current effective overrides to sessionStorage (call after navigation). */
export function persistOverrides(): void {
  const next = getOverridesSnapshot();
  try {
    if (FLAG_KEYS.every((k) => next[k] === undefined)) window.sessionStorage.removeItem(OVERRIDES_STORAGE_KEY);
    else window.sessionStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: overrides still apply from the URL */
  }
  listeners.forEach((l) => l());
}

export function subscribeOverrides(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
