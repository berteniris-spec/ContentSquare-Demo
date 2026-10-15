import { STORE_KEY, type FlagStore, type FlagStorePayload } from "./types";

const TIMEOUT_MS = 1500;

/** Upstash Redis over its REST API (plain fetch, no SDK). */
export function createUpstashStore(url: string, token: string): FlagStore {
  const base = url.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${token}` };

  return {
    name: "upstash",
    async read() {
      const res = await fetch(`${base}/get/${STORE_KEY}`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`store_read_${res.status}`);
      const body = (await res.json()) as { result?: string | null };
      return body.result ? (JSON.parse(body.result) as FlagStorePayload) : null;
    },
    async write(payload) {
      const res = await fetch(`${base}/set/${STORE_KEY}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`store_write_${res.status}`);
    },
  };
}
