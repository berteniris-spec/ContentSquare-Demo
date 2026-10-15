import { applyAction, parseAction } from "@/lib/flags/payload";
import { fullState, NO_STORE, readPayload, requirePin } from "@/lib/flags/server";
import { getStore } from "@/lib/flags/store";

// PIN-protected panel API (header x-demo-pin).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requirePin(request);
  if (denied) return denied;
  return Response.json(fullState(await readPayload()), { headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = await requirePin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400, headers: NO_STORE });
  }
  const action = parseAction(body);
  if (!action) return Response.json({ error: "invalid_body" }, { status: 400, headers: NO_STORE });

  const store = getStore();
  if (!store) return Response.json({ error: "store_not_configured" }, { status: 503, headers: NO_STORE });

  const current = await readPayload();
  if (current.error) return Response.json({ error: "store_error" }, { status: 502, headers: NO_STORE });
  const next = applyAction(current.payload, action);
  try {
    await store.write(next);
  } catch {
    return Response.json({ error: "store_error" }, { status: 502, headers: NO_STORE });
  }
  return Response.json(fullState({ configured: true, store: store.name, payload: next }), { headers: NO_STORE });
}
