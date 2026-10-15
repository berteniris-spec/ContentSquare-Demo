import { memoryStore } from "./memory";
import { createUpstashStore } from "./upstash";
import type { FlagStore } from "./types";

function upstashCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * Store selection, in order:
 * 1. FLAG_STORE=none          -> no store.
 * 2. FLAG_STORE=memory        -> memory store (wins over any Upstash vars, so e2e can never reach
 *                                the real store). Refused (no store) when process.env.VERCEL is set.
 * 3. FLAG_STORE=upstash       -> Upstash if credentials exist, else no store.
 * 4. FLAG_STORE empty/unknown -> auto: Upstash credentials present -> Upstash, else no store.
 */
export function getStore(): FlagStore | null {
  const mode = (process.env.FLAG_STORE ?? "").trim().toLowerCase();
  if (mode === "none") return null;
  if (mode === "memory") return process.env.VERCEL ? null : memoryStore;
  const creds = upstashCredentials();
  return creds ? createUpstashStore(creds.url, creds.token) : null;
}
