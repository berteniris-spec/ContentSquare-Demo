"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FLAG_KEYS, FRICTION, type FlagKey, type FrictionFlags } from "@/lib/config";
import { ENV_FLAGS } from "./env";
import {
  getOverridesSnapshot,
  persistOverrides,
  SERVER_OVERRIDES,
  subscribeOverrides,
} from "./overrides";
import { deriveProfile, resolveFlags, type FlagLayer, type FrictionProfile } from "./resolve";

interface FlagsContextValue {
  flags: FrictionFlags;
  profile: FrictionProfile;
  /** True once mounted, overrides applied and the global fetch settled (or 1.5 s passed). */
  ready: boolean;
}

const DEFAULT_FLAGS = resolveFlags({ env: ENV_FLAGS });
const FlagsContext = createContext<FlagsContextValue>({
  flags: DEFAULT_FLAGS,
  profile: deriveProfile(DEFAULT_FLAGS),
  ready: false,
});

const REFETCH_AFTER_MS = 30_000;
const READY_TIMEOUT_MS = 1500;

/** Keeps only known boolean flags from the /api/flags response. */
function parseGlobal(body: unknown): FlagLayer {
  const raw = (body as { flags?: Record<string, unknown> } | null)?.flags;
  const out: FlagLayer = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of FLAG_KEYS) if (typeof raw[key] === "boolean") out[key] = raw[key];
  return out;
}

const noopSubscribe = () => () => {};

/**
 * Server render and the first client render use env + code defaults only (no hydration mismatch).
 * After hydration the sessionStorage / `?friction=` overrides take priority.
 */
export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const override = useSyncExternalStore(subscribeOverrides, getOverridesSnapshot, () => SERVER_OVERRIDES);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [globalFlags, setGlobalFlags] = useState<FlagLayer>({});
  const [settled, setSettled] = useState(false);
  const lastFetch = useRef(0);

  // Global layer: fetch /api/flags after mount, then again on route change when older than 30 s.
  // Any failure leaves the layer as it was (env + defaults apply); nothing is logged.
  useEffect(() => {
    if (lastFetch.current && Date.now() - lastFetch.current < REFETCH_AFTER_MS) return;
    lastFetch.current = Date.now();
    let cancelled = false;
    let finished = false;
    fetch("/api/flags", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setGlobalFlags(parseGlobal(body));
      })
      .catch(() => {})
      .finally(() => {
        finished = true;
        if (!cancelled) setSettled(true);
      });
    return () => {
      cancelled = true;
      if (!finished) lastFetch.current = 0; // Strict Mode re-run: allow the second pass to fetch
    };
  }, [pathname]);

  // Never wait longer than 1.5 s for the global layer.
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), READY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  // Persist the URL param to sessionStorage on first load and on every route change.
  useEffect(() => {
    persistOverrides();
  }, [pathname]);

  const value = useMemo<FlagsContextValue>(() => {
    const flags = resolveFlags({ override, global: globalFlags, env: ENV_FLAGS, defaults: FRICTION });
    return { flags, profile: deriveProfile(flags), ready: mounted && settled };
  }, [override, globalFlags, mounted, settled]);

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FlagsContextValue {
  return useContext(FlagsContext);
}

/** The only way UI code reads a friction flag. */
export function useFlag(key: FlagKey): boolean {
  return useContext(FlagsContext).flags[key];
}
