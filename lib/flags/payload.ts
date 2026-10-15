import { FLAG_KEYS, FRICTION, type FlagKey, type FrictionFlags } from "@/lib/config";
import { ENV_FLAGS } from "./env";
import { deriveProfile, resolveFlags, type FlagLayer } from "./resolve";
import {
  HISTORY_CAP,
  type FlagAction,
  type FlagChange,
  type FlagStorePayload,
  type HistoryEntry,
} from "./store/types";

export const EMPTY_PAYLOAD: FlagStorePayload = { flags: {}, updatedAt: {}, flagHistory: [] };

const ACTIONS: FlagAction[] = ["toggle", "all_on", "all_off", "only_fix_errors"];
const isKey = (k: unknown): k is FlagKey => typeof k === "string" && (FLAG_KEYS as string[]).includes(k);

/** Defensive read of whatever came out of the store: unknown keys and bad types are dropped. */
export function sanitizePayload(raw: unknown): FlagStorePayload {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const flags: FlagLayer = {};
  const updatedAt: FlagStorePayload["updatedAt"] = {};
  const rawFlags = (src.flags ?? {}) as Record<string, unknown>;
  const rawUpdated = (src.updatedAt ?? {}) as Record<string, unknown>;
  for (const key of FLAG_KEYS) {
    if (typeof rawFlags[key] === "boolean") flags[key] = rawFlags[key];
    if (typeof rawUpdated[key] === "string") updatedAt[key] = rawUpdated[key];
  }
  const history: HistoryEntry[] = [];
  if (Array.isArray(src.flagHistory)) {
    for (const e of src.flagHistory.slice(0, HISTORY_CAP)) {
      if (!e || typeof e !== "object") continue;
      const entry = e as Record<string, unknown>;
      if (typeof entry.at !== "string" || !ACTIONS.includes(entry.action as FlagAction)) continue;
      const changes = (Array.isArray(entry.changes) ? entry.changes : []).filter(
        (c): c is FlagChange =>
          !!c && isKey((c as FlagChange).flag) && typeof (c as FlagChange).from === "boolean" && typeof (c as FlagChange).to === "boolean",
      );
      history.push({ at: entry.at, action: entry.action as FlagAction, changes });
    }
  }
  return { flags, updatedAt, flagHistory: history };
}

export type ParsedAction = { action: "toggle"; flag: FlagKey; value: boolean } | { action: Exclude<FlagAction, "toggle"> };

/** Returns null for a malformed body (route answers 400). */
export function parseAction(body: unknown): ParsedAction | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.action === "toggle") {
    return isKey(b.flag) && typeof b.value === "boolean" ? { action: "toggle", flag: b.flag, value: b.value } : null;
  }
  if (b.action === "all_on" || b.action === "all_off" || b.action === "only_fix_errors") return { action: b.action };
  return null;
}

function targetFlags(a: ParsedAction): FlagLayer {
  if (a.action === "toggle") return { [a.flag]: a.value };
  const all = (v: boolean): FrictionFlags => Object.fromEntries(FLAG_KEYS.map((k) => [k, v])) as FrictionFlags;
  if (a.action === "all_on") return all(true);
  if (a.action === "all_off") return all(false);
  return { ...all(true), expressShippingError: false, postcodeValidation: false };
}

/** Applies an action: one write, per-flag updatedAt for changed flags, one history entry, capped. */
export function applyAction(prev: FlagStorePayload, a: ParsedAction, now = new Date()): FlagStorePayload {
  const at = now.toISOString();
  const before = resolveFlags({ global: prev.flags, env: ENV_FLAGS, defaults: FRICTION });
  const target = targetFlags(a);
  const flags: FlagLayer = { ...prev.flags };
  const updatedAt = { ...prev.updatedAt };
  const changes: FlagChange[] = [];
  for (const key of FLAG_KEYS) {
    const to = target[key];
    if (to === undefined) continue;
    if (before[key] !== to) {
      changes.push({ flag: key, from: before[key], to });
      updatedAt[key] = at;
    } else if (flags[key] === undefined) {
      updatedAt[key] = at; // newly pinned globally
    }
    flags[key] = to;
  }
  const flagHistory = [{ at, action: a.action, changes }, ...prev.flagHistory].slice(0, HISTORY_CAP);
  return { flags, updatedAt, flagHistory };
}

export type FlagSource = "global" | "env" | "default";

export function describeEffective(payload: FlagStorePayload) {
  const effective = {} as Record<FlagKey, { value: boolean; source: FlagSource }>;
  const flags = resolveFlags({ global: payload.flags, env: ENV_FLAGS, defaults: FRICTION });
  for (const key of FLAG_KEYS) {
    const source: FlagSource = payload.flags[key] !== undefined ? "global" : ENV_FLAGS[key] !== undefined ? "env" : "default";
    effective[key] = { value: flags[key], source };
  }
  return { effective, profile: deriveProfile(flags) };
}

export { ENV_FLAGS as envDefaults, FRICTION as codeDefaults };
