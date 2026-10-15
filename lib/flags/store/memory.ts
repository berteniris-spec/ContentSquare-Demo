import { STORE_KEY, type FlagStore, type FlagStorePayload } from "./types";

// Kept on globalThis so every route bundle (and dev hot reloads) shares one copy.
const g = globalThis as unknown as Record<string, string | null | undefined>;
const SLOT = `__${STORE_KEY}`;

/** In-process store for local dev and Playwright. Never used on Vercel (see getStore). */
export const memoryStore: FlagStore = {
  name: "memory",
  async read() {
    const raw = g[SLOT];
    return raw ? (JSON.parse(raw) as FlagStorePayload) : null;
  },
  async write(payload) {
    g[SLOT] = JSON.stringify(payload);
  },
};
