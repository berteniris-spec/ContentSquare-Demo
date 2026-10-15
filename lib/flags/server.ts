// Shared server helpers for the flag routes.
import { codeDefaults, describeEffective, envDefaults, EMPTY_PAYLOAD, sanitizePayload } from "./payload";
import { checkPin, isPinConfigured } from "./pin";
import { getStore } from "./store";
import type { FlagStorePayload } from "./store/types";

export const NO_STORE = { "Cache-Control": "no-store" };

export async function readPayload(): Promise<
  { configured: false; store: null; payload: FlagStorePayload; error?: undefined }
  | { configured: true; store: "upstash" | "memory"; payload: FlagStorePayload; error?: boolean }
> {
  const store = getStore();
  if (!store) return { configured: false, store: null, payload: EMPTY_PAYLOAD };
  try {
    return { configured: true, store: store.name, payload: sanitizePayload(await store.read()) };
  } catch {
    return { configured: true, store: store.name, payload: EMPTY_PAYLOAD, error: true };
  }
}

export function fullState(r: Awaited<ReturnType<typeof readPayload>>) {
  return {
    configured: r.configured,
    store: r.store,
    ...(r.error ? { error: true } : {}),
    payload: r.payload,
    envDefaults: envDefaults,
    codeDefaults: codeDefaults,
    ...describeEffective(r.payload),
  };
}

/** Null when authorised, otherwise the error response (wrong PIN is delayed ~500 ms). */
export async function requirePin(request: Request): Promise<Response | null> {
  if (!isPinConfigured()) return Response.json({ error: "pin_not_configured" }, { status: 503, headers: NO_STORE });
  if (checkPin(request.headers.get("x-demo-pin"))) return null;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
}
