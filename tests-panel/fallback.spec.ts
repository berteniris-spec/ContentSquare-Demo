import { expect, test } from "@playwright/test";
import { FLAG_KEYS, H, PIN, collectErrors, stubTags } from "./helpers";

// Fallback paths. Each server is started by playwright.m6.config.ts with an explicit FLAG_STORE:
//   3101 none | 3102 memory + empty PIN | 3103 memory + VERCEL=1 (refused) | 3104 upstash with a FAKE unreachable URL
// No server here can reach the real store. 3104 is only ever read; it is used for POST only after
// /api/flags proved the fake URL is in effect.
const NONE = "http://localhost:3101";
const NOPIN = "http://localhost:3102";
const VERCEL = "http://localhost:3103";
const BROKEN = "http://localhost:3104";
const API = "/api/demo-controls/flags";

test.beforeEach(async ({ page }) => stubTags(page));

async function openPanel(page: import("@playwright/test").Page, base: string) {
  await page.goto(`${base}/demo-controls`);
  await page.getByTestId("pin-input").fill(PIN);
  await page.getByTestId("pin-submit").click();
  await page.getByTestId("store-status").waitFor();
}

async function expectUnconfiguredPanel(page: import("@playwright/test").Page, base: string, text: RegExp) {
  await openPanel(page, base);
  await expect(page.getByTestId("store-status")).toHaveText(text);
  await expect(page.getByTestId("store-status")).not.toContainText("(connected)");
  for (const k of FLAG_KEYS) await expect(page.getByTestId(`flag-toggle-${k}`)).toBeDisabled();
  for (const id of ["btn-all-on", "btn-all-off", "btn-only-fix-errors"]) await expect(page.getByTestId(id)).toBeDisabled();
  // still readable: effective values come from env/defaults, profile is shown, lock works
  await expect(page.getByTestId("friction-profile")).toHaveText("clean");
  for (const k of FLAG_KEYS) await expect(page.getByTestId(`flag-row-${k}`)).toContainText("build env");
  await expect(page.getByTestId("btn-lock")).toBeEnabled();
}

async function shopSweep(page: import("@playwright/test").Page, base: string) {
  const errors = collectErrors(page);
  const settled = page.waitForResponse((r) => r.url().includes("/api/flags"));
  await page.goto(`${base}/`);
  await settled;
  await page.evaluate(() => localStorage.clear());
  for (const path of ["/", "/category/all", "/category/bags", "/product/trailhead-28-backpack"]) {
    await page.goto(`${base}${path}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  }
  await seedCartAt(page, base);
  await page.goto(`${base}/cart`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("cart-subtotal")).toBeVisible();
  await page.goto(`${base}/checkout`);
  await page.waitForLoadState("networkidle");
  await page.getByTestId("checkout-postcode").fill("1012 AB");
  await page.getByTestId("shipping-express").check();
  await page.getByTestId("checkout-postcode").blur();
  await page.waitForTimeout(500);
  return errors;
}
async function seedCartAt(page: import("@playwright/test").Page, base: string) {
  const { PRODUCTS } = await import("../lib/products");
  const p = PRODUCTS.find((x) => x.slug === "hip-pack")!;
  await page.goto(`${base}/`);
  await page.evaluate(
    (cart) => localStorage.setItem("tw-cart-v1", cart),
    JSON.stringify({ items: [{ productId: p.id, slug: p.slug, name: p.name, colour: p.colours[0].slug, unitPrice: p.price, quantity: 1 }], promoCode: null }),
  );
}

test.describe("FLAG_STORE=none (store not configured)", () => {
  test("/api/flags: 200, configured:false, empty flags, public cache headers", async ({ request }) => {
    const res = await request.get(`${NONE}/api/flags`);
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("public, max-age=0, s-maxage=10, stale-while-revalidate=20");
    expect(await res.json()).toEqual({ configured: false, store: null, flags: {}, updatedAt: {} });
  });

  test("panel API: wrong/missing PIN 401; right PIN GET 200 with configured:false; valid POST 503 store_not_configured; bad body 400", async ({ request }) => {
    expect((await request.get(`${NONE}${API}`)).status()).toBe(401);
    expect((await request.post(`${NONE}${API}`, { headers: { "x-demo-pin": "x" }, data: { action: "all_on" } })).status()).toBe(401);
    const g = await request.get(`${NONE}${API}`, { headers: H });
    expect(g.status()).toBe(200);
    expect(g.headers()["cache-control"]).toBe("no-store");
    const s = await g.json();
    expect(s).toMatchObject({ configured: false, store: null, profile: "clean" });
    expect(s.payload).toEqual({ flags: {}, updatedAt: {}, flagHistory: [] });
    const p = await request.post(`${NONE}${API}`, { headers: H, data: { action: "all_on" } });
    expect(p.status()).toBe(503);
    expect(await p.json()).toEqual({ error: "store_not_configured" });
    expect(p.headers()["cache-control"]).toBe("no-store");
    expect((await request.post(`${NONE}${API}`, { headers: H, data: { action: "bogus" } })).status()).toBe(400);
    // nothing was stored
    expect((await (await request.get(`${NONE}/api/flags`)).json()).flags).toEqual({});
  });

  test("panel shows the warning, switches and master buttons disabled, nothing changes when forced", async ({ page }) => {
    await expectUnconfiguredPanel(page, NONE, /Global store not configured: toggles disabled\. Visitors use env defaults and \?friction= overrides\./);
    await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}/demo-controls-unconfigured.png`, fullPage: true });
    // forcing a click on a disabled switch does nothing
    await page.getByTestId("flag-toggle-slowHero").click({ force: true, trial: false }).catch(() => {});
    await expect(page.getByTestId("flag-toggle-slowHero")).toHaveAttribute("aria-checked", "false");
    await expect(page.getByTestId("flag-history-entry")).toHaveCount(0);
    await expect(page.getByTestId("panel-error")).toHaveCount(0);
  });

  test("shop works with env defaults: no console or page errors across routes, /api/flags 200, express checkout clean", async ({ page }) => {
    const errors = await shopSweep(page, NONE);
    expect(errors).toEqual([]);
    await page.goto(`${NONE}/category/bags`);
    await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0); // env OFF applied
  });

  test("?friction= overrides still work without a store", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${NONE}/category/bags?friction=decoyBanner:on`);
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    await seedCartAt(page, NONE);
    await page.goto(`${NONE}/checkout?friction=expressShippingError:on`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("checkout-postcode").fill("1012 AB");
    await page.getByTestId("shipping-express").check();
    await expect.poll(() => errors.filter((e) => e.startsWith("pageerror")).length).toBeGreaterThan(0);
  });
});

test.describe("DEMO_CONTROLS_PIN empty (PIN not configured)", () => {
  test("panel API answers 503 pin_not_configured to everything, even with a header, an empty header or an empty-string guess", async ({ request }) => {
    for (const headers of [{}, { "x-demo-pin": "" }, { "x-demo-pin": PIN }, { "x-demo-pin": "undefined" }] as Array<Record<string, string>>) {
      const g = await request.get(`${NOPIN}${API}`, { headers });
      expect(g.status(), JSON.stringify(headers)).toBe(503);
      expect(await g.json()).toEqual({ error: "pin_not_configured" });
      expect(g.headers()["cache-control"]).toBe("no-store");
      const p = await request.post(`${NOPIN}${API}`, { headers, data: { action: "all_on" } });
      expect(p.status(), JSON.stringify(headers)).toBe(503);
    }
    // nothing could be written
    expect((await (await request.get(`${NOPIN}/api/flags`)).json()).flags).toEqual({});
  });

  test("panel page shows 'Control panel disabled: set DEMO_CONTROLS_PIN' and no PIN field or controls", async ({ page }) => {
    await page.goto(`${NOPIN}/demo-controls`);
    await expect(page.getByTestId("pin-disabled")).toHaveText("Control panel disabled: set DEMO_CONTROLS_PIN");
    for (const id of ["pin-input", "pin-submit", "store-status", "btn-all-on", "flag-toggle-slowHero"]) await expect(page.getByTestId(id)).toHaveCount(0);
    await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}/demo-controls-pin-disabled.png`, fullPage: true });
    // a stored PIN from an earlier session cannot unlock it
    await page.evaluate(() => sessionStorage.setItem("tw-demo-pin", ""));
    await page.reload();
    await expect(page.getByTestId("pin-disabled")).toBeVisible();
  });

  test("the public flags endpoint and the shop still work", async ({ request, page }) => {
    const res = await request.get(`${NOPIN}/api/flags`);
    expect(res.status()).toBe(200);
    expect((await res.json()).configured).toBe(true);
    const errors = collectErrors(page);
    await page.goto(`${NOPIN}/`);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});

test.describe("FLAG_STORE=memory with VERCEL set (refused at runtime)", () => {
  test("behaves as unconfigured: /api/flags configured:false, POST 503, panel shows the warning and disabled controls", async ({ request, page }) => {
    expect(await (await request.get(`${VERCEL}/api/flags`)).json()).toEqual({ configured: false, store: null, flags: {}, updatedAt: {} });
    const p = await request.post(`${VERCEL}${API}`, { headers: H, data: { action: "all_on" } });
    expect(p.status()).toBe(503);
    expect(await p.json()).toEqual({ error: "store_not_configured" });
    await expectUnconfiguredPanel(page, VERCEL, /Global store not configured/);
  });
});

test.describe("store configured but failing (Upstash with a fake unreachable URL)", () => {
  test("/api/flags stays 200 with error:true and a short cache; shop works without console errors", async ({ request, page }) => {
    const res = await request.get(`${BROKEN}/api/flags`);
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("public, max-age=0, s-maxage=5");
    expect(await res.json()).toEqual({ configured: true, store: "upstash", error: true, flags: {}, updatedAt: {} });
    const errors = await shopSweep(page, BROKEN);
    // the browser may log the network failure of nothing here: /api/flags itself answers 200
    expect(errors).toEqual([]);
  });

  test("panel API: GET 200 with error:true; POST gets 502 store_error and the panel shows 'not reachable' with disabled controls", async ({ request, page }) => {
    const pub = await (await request.get(`${BROKEN}/api/flags`)).json();
    expect(pub.error, "fake URL must be in effect or this test must not POST").toBe(true);
    const g = await request.get(`${BROKEN}${API}`, { headers: H });
    expect(g.status()).toBe(200);
    expect(await g.json()).toMatchObject({ configured: true, store: "upstash", error: true });
    const p = await request.post(`${BROKEN}${API}`, { headers: H, data: { action: "all_on" } });
    expect(p.status()).toBe(502);
    expect(await p.json()).toEqual({ error: "store_error" });
    await openPanel(page, BROKEN);
    await expect(page.getByTestId("store-status")).toContainText("Global store not reachable: toggles disabled");
    for (const k of FLAG_KEYS) await expect(page.getByTestId(`flag-toggle-${k}`)).toBeDisabled();
    await expect(page.getByTestId("btn-all-on")).toBeDisabled();
    await page.screenshot({ path: `test-results/screenshots/${test.info().project.name}/demo-controls-store-error.png`, fullPage: true });
  });
});
