import { FRICTION } from "../lib/config";
import { applyAction, parseAction } from "../lib/flags/payload";
import { checkPin } from "../lib/flags/pin";
import { getStore } from "../lib/flags/store";
import { HISTORY_CAP, type FlagStorePayload } from "../lib/flags/store/types";
import { expect, test } from "./fixtures";

// M6 smoke tests (Builder). The shared in-memory store is process-wide, so the mutating tests only
// touch expressShippingError (inert unless Express + a postcode starting 10) and always restore it.
const PIN = "246810";
const H = { "x-demo-pin": PIN };

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test.describe("store selection and PIN (unit)", () => {
  const KV = { KV_REST_API_URL: "https://example.invalid", KV_REST_API_TOKEN: "x", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined };

  test("FLAG_STORE=memory beats Upstash vars", () => {
    expect(withEnv({ ...KV, FLAG_STORE: "memory", VERCEL: undefined }, () => getStore()?.name)).toBe("memory");
  });
  test("memory is refused on Vercel", () => {
    expect(withEnv({ ...KV, FLAG_STORE: "memory", VERCEL: "1" }, () => getStore())).toBeNull();
  });
  test("auto-detect: Upstash vars -> upstash, none otherwise; none wins", () => {
    expect(withEnv({ ...KV, FLAG_STORE: "" }, () => getStore()?.name)).toBe("upstash");
    expect(
      withEnv({ FLAG_STORE: "", KV_REST_API_URL: undefined, KV_REST_API_TOKEN: undefined, UPSTASH_REDIS_REST_URL: "https://e.invalid", UPSTASH_REDIS_REST_TOKEN: "t" }, () => getStore()?.name),
    ).toBe("upstash");
    expect(withEnv({ FLAG_STORE: "", KV_REST_API_URL: undefined, KV_REST_API_TOKEN: undefined, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined }, () => getStore())).toBeNull();
    expect(withEnv({ ...KV, FLAG_STORE: "none" }, () => getStore())).toBeNull();
  });
  test("checkPin: constant-time helper accepts only the exact PIN; unset = disabled", () => {
    expect(withEnv({ DEMO_CONTROLS_PIN: PIN }, () => [checkPin(PIN), checkPin("246811"), checkPin(""), checkPin(null)])).toEqual([true, false, false, false]);
    expect(withEnv({ DEMO_CONTROLS_PIN: undefined }, () => checkPin(""))).toBe(false);
  });
});

test.describe("actions (unit)", () => {
  const empty: FlagStorePayload = { flags: {}, updatedAt: {}, flagHistory: [] };
  test("only_fix_errors: 7 on, express and postcode off, one history entry", () => {
    const next = applyAction(empty, { action: "only_fix_errors" }, new Date("2026-01-01T00:00:00Z"));
    expect(next.flags.expressShippingError).toBe(false);
    expect(next.flags.postcodeValidation).toBe(false);
    expect(Object.values(next.flags).filter(Boolean)).toHaveLength(7);
    expect(next.flagHistory).toHaveLength(1);
    expect(next.flagHistory[0].changes.map((c) => c.flag)).toEqual(["postcodeValidation"]);
  });
  test("history is capped at 30; bad bodies are rejected", () => {
    let p = empty;
    for (let i = 0; i < HISTORY_CAP + 5; i++) p = applyAction(p, { action: "toggle", flag: "slowHero", value: i % 2 === 0 });
    expect(p.flagHistory).toHaveLength(HISTORY_CAP);
    expect(parseAction({ action: "toggle", flag: "nope", value: true })).toBeNull();
    expect(parseAction({ action: "toggle", flag: "slowHero", value: "yes" })).toBeNull();
    expect(parseAction({ action: "all_on" })).toEqual({ action: "all_on" });
    expect(FRICTION.expressShippingError).toBe(false);
  });
});

test.describe("API", () => {
  test("/api/flags: public, cache headers, memory store (not the real one)", async ({ request }) => {
    const res = await request.get("/api/flags");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("public, max-age=0, s-maxage=10, stale-while-revalidate=20");
    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.store).toBe("memory");
    expect(body).not.toHaveProperty("flagHistory");
  });

  test("panel API rejects missing/wrong PIN and malformed bodies", async ({ request }) => {
    for (const headers of [{} as Record<string, string>, { "x-demo-pin": "000000" }]) {
      expect((await request.get("/api/demo-controls/flags", { headers })).status()).toBe(401);
      expect((await request.post("/api/demo-controls/flags", { headers, data: { action: "all_on" } })).status()).toBe(401);
    }
    const bad = await request.post("/api/demo-controls/flags", { headers: H, data: { action: "toggle", flag: "nope", value: true } });
    expect(bad.status()).toBe(400);
    const ok = await request.get("/api/demo-controls/flags", { headers: H });
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toBe("no-store");
  });

  test("toggle updates state, updatedAt and history; a fresh context sees it; OFF restores", async ({ request, browser }) => {
    const post = (value: boolean) =>
      request.post("/api/demo-controls/flags", { headers: H, data: { action: "toggle", flag: "expressShippingError", value } });
    try {
      const on = await (await post(true)).json();
      expect(on.effective.expressShippingError).toEqual({ value: true, source: "global" });
      expect(on.profile).toBe("express_error");
      expect(on.payload.updatedAt.expressShippingError).toBeTruthy();
      expect(on.payload.flagHistory[0].action).toBe("toggle");
      expect((await (await request.get("/api/flags")).json()).flags.expressShippingError).toBe(true);

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const body = await (await page.request.get("/api/flags")).json();
      expect(body.flags.expressShippingError).toBe(true);
      await ctx.close();
      expect(errors).toEqual([]);
    } finally {
      const off = await (await post(false)).json();
      expect(off.effective.expressShippingError.value).toBe(false);
    }
  });
});

test.describe("panel and robots", () => {
  test("robots.txt disallows the panel; page is noindex", async ({ request, page }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /demo-controls");
    await page.goto("/demo-controls");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("PIN gate: wrong PIN, then unlock, toggle, history, lock", async ({ page, csRequests, gaRequests }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // The browser itself logs the deliberate 401 for the wrong PIN; anything else is a real error.
    page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && errors.push(m.text()));
    await page.goto("/demo-controls");
    await page.getByTestId("pin-input").fill("111111");
    await page.getByTestId("pin-submit").click();
    await expect(page.getByTestId("pin-error")).toHaveText(/Wrong PIN/);
    await page.getByTestId("pin-input").fill(PIN);
    await page.getByTestId("pin-submit").click();
    await expect(page.getByTestId("store-status")).toContainText("memory");

    const toggle = page.getByTestId("flag-toggle-expressShippingError");
    try {
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await expect(page.getByTestId("friction-profile")).toHaveText("express_error");
      await expect(page.getByTestId("flag-updated-expressShippingError")).not.toHaveText("never");
      await expect(page.getByTestId("flag-history")).toContainText("Express shipping error");
    } finally {
      if ((await toggle.getAttribute("aria-checked")) === "true") await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "false");
    }
    await page.getByTestId("btn-lock").click();
    await expect(page.getByTestId("pin-input")).toBeVisible();
    expect(csRequests).toHaveLength(0);
    expect(gaRequests).toHaveLength(0);
    expect(errors).toEqual([]);
  });
});
