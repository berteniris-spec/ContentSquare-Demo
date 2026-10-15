import { readPayload } from "@/lib/flags/server";

// Public read of the global flag layer. Never includes history.
export const dynamic = "force-dynamic";

const OK = "public, max-age=0, s-maxage=10, stale-while-revalidate=20";
const ERR = "public, max-age=0, s-maxage=5";

export async function GET() {
  const r = await readPayload();
  if (r.error) {
    return Response.json(
      { configured: true, store: r.store, error: true, flags: {}, updatedAt: {} },
      { headers: { "Cache-Control": ERR } },
    );
  }
  return Response.json(
    { configured: r.configured, store: r.store, flags: r.payload.flags, updatedAt: r.payload.updatedAt },
    { headers: { "Cache-Control": OK } },
  );
}
