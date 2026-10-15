import type { FlagKey, FrictionFlags } from "@/lib/config";

export type StoreName = "upstash" | "memory";

export type FlagAction = "toggle" | "all_on" | "all_off" | "only_fix_errors";

export interface FlagChange {
  flag: FlagKey;
  from: boolean;
  to: boolean;
}

export interface HistoryEntry {
  /** ISO timestamp. */
  at: string;
  action: FlagAction;
  changes: FlagChange[];
}

/** What is persisted under the key `tw:friction`. */
export interface FlagStorePayload {
  /** Global layer: only keys that were set from the panel. */
  flags: Partial<FrictionFlags>;
  /** ISO time of the last change per flag. */
  updatedAt: Partial<Record<FlagKey, string>>;
  /** Newest first, capped at HISTORY_CAP. */
  flagHistory: HistoryEntry[];
}

export interface FlagStore {
  name: StoreName;
  /** Resolves null when nothing has been stored yet. Rejects on store failure. */
  read(): Promise<FlagStorePayload | null>;
  write(payload: FlagStorePayload): Promise<void>;
}

export const STORE_KEY = "tw:friction";
export const HISTORY_CAP = 30;
export const HISTORY_SHOWN = 20;
