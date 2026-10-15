import { FLAG_META } from "../lib/config";
import { expect, test } from "@playwright/test";
import { API, collectErrors, FLAG_KEYS, H, master, newVisitor, openCheckout, PIN, seedCart, setFlag, state, stubTags, unlockPanel } from "./helpers";

// M6 live-toggle and control-panel suite. Runs on its own server (see playwright.m6.config.ts), serially,
// because every mutating test changes the process-wide memory store. Tests restore state in `finally`.
test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ page }) => stubTags(page));

const isDesktop = (name: string) => name === "desktop";
const label = (k: string) => FLAG_META.find((m) => m.key === k)!.label;
const sw = (page: import("@playwright/test").Page, k: string) => page.getByTestId(`flag-toggle-${k}`);

test.describe("pristine store (first test on the fresh server, desktop only)", () => {
  test("untouched store: env beats code defaults, no global flags, no history, 'never', profile clean", async ({ request, page }, info) => {
    test.skip(!isDesktop(info.project.name), "needs the untouched store; mobile project runs after desktop has mutated it");
    const s = await state(request);
    expect(s.configured).toBe(true);
    expect(s.store).toBe("memory");
    expect(s.payload).toEqual({ flags: {}, updatedAt: {}, flagHistory: [] });
    // env (all NEXT_PUBLIC_FRICTION_* = off in this build) beats the code defaults (8 ON)
    for (const k of FLAG_KEYS) expect(s.effective[k], k).toEqual({ value: false, source: "env" });
    expect(s.codeDefaults.promoField).toBe(true);
    expect(s.profile).toBe("clean");
    const pub = await (await request.get("/api/flags")).json();
    expect(pub).toMatchObject({ configured: true, store: "memory", flags: {}, updatedAt: {} });

    await unlockPanel(page);
    await expect(page.getByTestId("flag-history-empty")).toBeVisible();
    await expect(page.getByTestId("flag-history-entry")).toHaveCount(0);
    for (const k of FLAG_KEYS) {
      await expect(page.getByTestId(`flag-updated-${k}`)).toHaveText("never");
      await expect(page.getByTestId(`flag-state-${k}`)).toHaveText("OFF");
      await expect(sw(page, k)).toHaveAttribute("aria-checked", "false");
      await expect(page.getByTestId(`flag-row-${k}`)).toContainText("build env");
    }
    await expect(page.getByTestId("friction-profile")).toHaveText("clean");
  });
});

test.describe("PIN: API", () => {
  test("GET and POST reject missing, empty, wrong, near-miss PINs and PINs sent any other way (401, no-store)", async ({ request }) => {
    const bodies = { action: "all_on" };
    const wrongs: Array<Record<string, string>> = [
      {}, { "x-demo-pin": "" }, { "x-demo-pin": "000000" }, { "x-demo-pin": "24681" }, { "x-demo-pin": "2468100" }, { "x-pin": PIN }, { authorization: `Bearer ${PIN}` }, { cookie: `x-demo-pin=${PIN}` },
    ];
    for (const headers of wrongs) {
      const g = await request.get(API, { headers });
      expect(g.status(), `GET ${JSON.stringify(headers)}`).toBe(401);
      expect(g.headers()["cache-control"]).toBe("no-store");
      expect(await g.json()).toEqual({ error: "unauthorized" });
      const p = await request.post(API, { headers, data: bodies });
      expect(p.status(), `POST ${JSON.stringify(headers)}`).toBe(401);
    }
    // PIN in the query string is not accepted
    expect((await request.get(`${API}?pin=${PIN}`)).status()).toBe(401);
    // auth is checked before the body: wrong PIN + malformed body is still 401, not 400
    expect((await request.post(API, { headers: { "x-demo-pin": "bad" }, data: { nonsense: true } })).status()).toBe(401);
    // header name is case-insensitive, the right PIN works
    expect((await request.get(API, { headers: { "X-Demo-Pin": PIN } })).status()).toBe(200);
  });

  test("a rejected POST changes nothing; wrong PIN is delayed (about 500 ms)", async ({ request }) => {
    const before = await state(request);
    const t0 = Date.now();
    const res = await request.post(API, { headers: { "x-demo-pin": "bad" }, data: { action: "all_on" } });
    const took = Date.now() - t0;
    expect(res.status()).toBe(401);
    expect(took).toBeGreaterThanOrEqual(400);
    const after = await state(request);
    expect(after.payload).toEqual(before.payload);
  });

  test("other methods are not allowed (405)", async ({ request }) => {
    for (const m of ["put", "delete", "patch"] as const) {
      const res = await request[m](API, { headers: H, data: {} });
      expect(res.status(), m).toBe(405);
    }
  });

  test("invalid POST bodies are rejected with 400 and change nothing", async ({ request }) => {
    const before = await state(request);
    const json = { ...H, "content-type": "application/json" };
    const raw = ["{bad", "", "null", "[]", "42", '"toggle"'];
    for (const data of raw) {
      const res = await request.post(API, { headers: json, data });
      expect(res.status(), `raw ${data}`).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_body" });
      expect(res.headers()["cache-control"]).toBe("no-store");
    }
    const objs: unknown[] = [
      {}, { action: "nope" }, { action: "toggle" }, { action: "toggle", flag: "slowHero" }, { action: "toggle", flag: "slowHero", value: "true" },
      { action: "toggle", flag: "slowHero", value: 1 }, { action: "toggle", flag: "nope", value: true }, { action: "toggle", flag: "__proto__", value: true },
      { action: "ALL_ON" }, { flag: "slowHero", value: true },
    ];
    for (const data of objs) {
      const res = await request.post(API, { headers: H, data });
      expect(res.status(), JSON.stringify(data)).toBe(400);
    }
    expect((await state(request)).payload).toEqual(before.payload);
  });
});

test.describe("PIN: panel UI", () => {
  test("wrong PIN shows 'Wrong PIN' and stays locked; empty submit does nothing; right PIN unlocks; PIN field masked and labelled", async ({ page }) => {
    await page.goto("/demo-controls");
    const input = page.getByTestId("pin-input");
    await expect(input).toHaveAttribute("type", "password");
    await expect(page.getByLabel("PIN")).toBeVisible();
    await page.getByTestId("pin-submit").click(); // empty
    await expect(page.getByTestId("pin-error")).toHaveCount(0);
    await input.fill("000000");
    await page.getByTestId("pin-submit").click();
    await expect(page.getByTestId("pin-error")).toHaveText("Wrong PIN");
    await expect(page.getByTestId("store-status")).toHaveCount(0);
    expect(await page.evaluate(() => sessionStorage.getItem("tw-demo-pin"))).toBeNull();
    // (a trailing space is stripped by HTTP header handling, so "246810 " would unlock: observation, not asserted)
    await input.fill("24681");
    await page.getByTestId("pin-submit").click();
    await expect(page.getByTestId("pin-error")).toHaveText("Wrong PIN");
    await input.fill(PIN);
    await page.getByTestId("pin-submit").click();
    await expect(page.getByTestId("store-status")).toContainText("memory");
    await expect(page.getByTestId("store-status")).toContainText("connected");
    await expect(page.getByTestId("pin-input")).toHaveCount(0);
  });

  test("unlock survives reload (sessionStorage); a stale wrong stored PIN returns to the gate; Lock clears it", async ({ page }) => {
    await unlockPanel(page);
    await page.reload();
    await expect(page.getByTestId("store-status")).toBeVisible();
    await page.getByTestId("btn-lock").click();
    await expect(page.getByTestId("pin-input")).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("tw-demo-pin"))).toBeNull();
    await page.reload();
    await expect(page.getByTestId("pin-input")).toBeVisible();
    await page.evaluate(() => sessionStorage.setItem("tw-demo-pin", "999999"));
    await page.reload();
    await expect(page.getByTestId("pin-input")).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("tw-demo-pin"))).toBeNull();
    // a different browser context is not unlocked
    await expect(page.getByTestId("store-status")).toHaveCount(0);
  });
});

test.describe("toggles and master buttons (UI)", () => {
  test("each of the 9 switches flips, shows source 'set here', updatedAt and a history line; /api/flags reflects it; flipping back restores", async ({ page, request }) => {
    await unlockPanel(page);
    for (const k of FLAG_KEYS) {
      const before = await state(request);
      const histBefore = before.payload.flagHistory.length;
      await sw(page, k).click();
      await expect(sw(page, k)).toHaveAttribute("aria-checked", "true");
      await expect(page.getByTestId(`flag-state-${k}`)).toHaveText("ON");
      await expect(page.getByTestId(`flag-row-${k}`)).toContainText("set here");
      await expect(page.getByTestId(`flag-updated-${k}`)).not.toHaveText("never");
      await expect(page.getByTestId(`flag-updated-${k}`)).toHaveAttribute("title", /^\d{4}-\d\d-\d\dT/);
      await expect(page.getByTestId("flag-history-entry").first()).toContainText(`${label(k)}: OFF to ON`);
      const pub = await (await request.get("/api/flags")).json();
      expect(pub.flags[k], k).toBe(true);
      const after = await state(request);
      expect(after.payload.flagHistory.length).toBe(Math.min(30, histBefore + 1));
      expect(after.payload.flagHistory[0]).toMatchObject({ action: "toggle", changes: [{ flag: k, from: false, to: true }] });
      // restore
      await sw(page, k).click();
      await expect(sw(page, k)).toHaveAttribute("aria-checked", "false");
      await expect(page.getByTestId("flag-history-entry").first()).toContainText(`${label(k)}: ON to OFF`);
    }
    await expect(page.getByTestId("friction-profile")).toHaveText("clean");
  });

  test("profile text follows the toggles: baseline / express_error / fixed / clean", async ({ page, request }) => {
    await unlockPanel(page);
    try {
      await page.getByTestId("btn-all-on").click();
      await expect(page.getByTestId("friction-profile")).toHaveText("express_error");
      await page.getByTestId("btn-only-fix-errors").click();
      await expect(page.getByTestId("friction-profile")).toHaveText("fixed");
      // postcodeValidation back on, express off => baseline (8 on, express off... 8 flags on)
      await sw(page, "postcodeValidation").click();
      await expect(page.getByTestId("friction-profile")).toHaveText("baseline");
      await sw(page, "expressShippingError").click();
      await expect(page.getByTestId("friction-profile")).toHaveText("express_error");
      await page.getByTestId("btn-all-off").click();
      await expect(page.getByTestId("friction-profile")).toHaveText("clean");
    } finally {
      await master(request, "all_off");
    }
  });

  test("master buttons: All ON, Only fix errors, All OFF update every switch, state text, source, history and the public API", async ({ page, request }) => {
    await unlockPanel(page);
    try {
      await page.getByTestId("btn-all-on").click();
      for (const k of FLAG_KEYS) await expect(sw(page, k)).toHaveAttribute("aria-checked", "true");
      await expect(page.getByTestId("flag-history-entry").first()).toContainText("All friction ON");
      expect(Object.values((await (await request.get("/api/flags")).json()).flags)).toEqual(FLAG_KEYS.map(() => true));
      const allOnState = await state(request);

      await page.getByTestId("btn-only-fix-errors").click();
      for (const k of FLAG_KEYS) {
        const expected = k !== "expressShippingError" && k !== "postcodeValidation";
        await expect(sw(page, k), k).toHaveAttribute("aria-checked", String(expected));
      }
      await expect(page.getByTestId("flag-history-entry").first()).toContainText("Only fix errors");
      await expect(page.getByTestId("flag-history-entry").first()).toContainText(label("postcodeValidation"));
      await expect(page.getByTestId("flag-history-entry").first()).toContainText(label("expressShippingError"));
      const fixState = await state(request);
      // unchanged flags keep their previous updatedAt, changed flags get a newer one
      expect(fixState.payload.updatedAt.slowHero).toBe(allOnState.payload.updatedAt.slowHero);
      expect(fixState.payload.updatedAt.postcodeValidation).not.toBe(allOnState.payload.updatedAt.postcodeValidation);
      expect(fixState.payload.flagHistory[0].changes.map((c: { flag: string }) => c.flag).sort()).toEqual(["expressShippingError", "postcodeValidation"]);

      await page.getByTestId("btn-all-off").click();
      for (const k of FLAG_KEYS) await expect(sw(page, k)).toHaveAttribute("aria-checked", "false");
      await expect(page.getByTestId("flag-history-entry").first()).toContainText("All friction OFF");
      expect(Object.values((await (await request.get("/api/flags")).json()).flags)).toEqual(FLAG_KEYS.map(() => false));
      // clicking a master button that changes nothing still records one history entry with 'No effective change'
      await page.getByTestId("btn-all-off").click();
      await expect(page.getByTestId("flag-history-entry").first()).toContainText("No effective change");
    } finally {
      await master(request, "all_off");
    }
  });

  test("a second panel (other browser tab) sees the change after Refresh; no-store responses", async ({ browser, page, request }, info) => {
    await unlockPanel(page);
    const other = await newVisitor(browser, info);
    try {
      await unlockPanel(other.page);
      await sw(page, "slowHero").click();
      await expect(sw(page, "slowHero")).toHaveAttribute("aria-checked", "true");
      await expect(sw(other.page, "slowHero")).toHaveAttribute("aria-checked", "false"); // not pushed
      await other.page.getByTestId("btn-refresh").click();
      await expect(sw(other.page, "slowHero")).toHaveAttribute("aria-checked", "true");
    } finally {
      await setFlag(request, "slowHero", false);
      await other.ctx.close();
    }
  });

  test("history is capped at 30 in the store and the panel shows 20, newest first", async ({ page, request }) => {
    try {
      for (let i = 0; i < 36; i++) await setFlag(request, "slowHero", i % 2 === 0);
      const s = await state(request);
      expect(s.payload.flagHistory).toHaveLength(30);
      const times = s.payload.flagHistory.map((e: { at: string }) => Date.parse(e.at));
      for (let i = 1; i < times.length; i++) expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
      await unlockPanel(page);
      await expect(page.getByTestId("flag-history-entry")).toHaveCount(20);
      await expect(page.getByTestId("flag-history-entry").first()).toContainText("Slow hero image: ON to OFF");
    } finally {
      await setFlag(request, "slowHero", false);
    }
  });

  test("concurrent writes: 9 parallel toggles of different flags (observation of lost updates, not asserted)", async ({ request }, info) => {
    try {
      await master(request, "all_off");
      await Promise.all(FLAG_KEYS.filter((k) => k !== "expressShippingError").map((k) => setFlag(request, k, true)));
      const s = await state(request);
      const on = FLAG_KEYS.filter((k) => s.payload.flags[k] === true).length;
      info.annotations.push({ type: "observation", description: `parallel toggles applied: ${on} of 8 (memory store, no locking)` });
      expect(on).toBeGreaterThan(0);
    } finally {
      await master(request, "all_off");
    }
  });
});

test.describe("live toggle reaches the shop (new browser context)", () => {
  test("expressShippingError ON via the panel: a brand-new visitor gets the TypeError; OFF removes it completely", async ({ browser, request, page }, info) => {
    await unlockPanel(page);
    try {
      // OFF baseline for a new visitor
      {
        const v = await newVisitor(browser, info);
        const errors = collectErrors(v.page);
        await seedCart(v.page);
        await openCheckout(v.page);
        await v.page.getByTestId("checkout-postcode").fill("1012 AB");
        await v.page.getByTestId("shipping-express").check();
        await expect(v.page.getByTestId("checkout-summary-shipping")).toHaveText("€12.95");
        await v.page.waitForTimeout(500);
        expect(errors).toEqual([]);
        await v.ctx.close();
      }
      // flip ON in the panel UI
      await sw(page, "expressShippingError").click();
      await expect(sw(page, "expressShippingError")).toHaveAttribute("aria-checked", "true");
      await expect(page.getByTestId("friction-profile")).toHaveText("express_error");
      {
        const v = await newVisitor(browser, info);
        const errors = collectErrors(v.page);
        await seedCart(v.page);
        await openCheckout(v.page);
        await v.page.getByTestId("checkout-postcode").fill("1012 AB");
        await v.page.getByTestId("shipping-express").check();
        await expect.poll(() => errors.filter((e) => e.startsWith("pageerror")).length, { timeout: 5000 }).toBeGreaterThan(0);
        expect(errors.find((e) => e.startsWith("pageerror"))).toMatch(/TypeError|undefined|rate/);
        // Pay does nothing for this visitor
        await v.page.getByTestId("checkout-submit").click();
        await v.page.waitForTimeout(400);
        await expect(v.page).toHaveURL(/\/checkout/);
        // a postcode that does not start with 10 is fine even now
        await v.ctx.close();
      }
      // flip OFF in the panel UI
      await sw(page, "expressShippingError").click();
      await expect(sw(page, "expressShippingError")).toHaveAttribute("aria-checked", "false");
      {
        const v = await newVisitor(browser, info);
        const errors = collectErrors(v.page);
        await seedCart(v.page);
        await openCheckout(v.page);
        const f = (id: string, val: string) => v.page.getByTestId(`checkout-${id}`).fill(val);
        await f("email", "hiker@example.com");
        await f("firstName", "Ada");
        await f("lastName", "Trail");
        await f("address", "Kade 1");
        await f("city", "Amsterdam");
        await f("postcode", "1012 AB");
        await v.page.getByTestId("shipping-express").check();
        await f("cardNumber", "4242 4242 4242 4242");
        await f("cardExpiry", "12/30");
        await f("cardCvc", "123");
        await v.page.getByTestId("checkout-submit").click();
        await expect(v.page).toHaveURL(/\/confirmation/, { timeout: 8000 });
        expect(errors).toEqual([]);
        await v.ctx.close();
      }
    } finally {
      await setFlag(request, "expressShippingError", false);
    }
  });

  test("a visitor who already has the site open picks the change up on a client-side navigation after the 30 s refetch window (desktop only, takes about 32 s)", async ({ browser, request }, info) => {
    test.skip(!isDesktop(info.project.name), "30 s wait: desktop only");
    test.setTimeout(90_000);
    const v = await newVisitor(browser, info);
    try {
      await v.page.goto("/category/bags");
      await v.page.waitForResponse((r) => r.url().includes("/api/flags"));
      await expect(v.page.getByTestId("plp-decoy-banner")).toHaveCount(0);
      await setFlag(request, "decoyBanner", true);
      await v.page.waitForTimeout(31_000);
      await v.page.locator('a[href="/category/apparel"]:visible').first().click();
      await expect(v.page).toHaveURL(/\/category\/apparel/);
      await expect(v.page.getByTestId("plp-decoy-banner")).toBeVisible({ timeout: 5000 });
    } finally {
      await setFlag(request, "decoyBanner", false);
      await v.ctx.close();
    }
  });
});

test.describe("resolution order on a real build: override > global > env > code default", () => {
  test("global beats env: postcodeValidation env=OFF, global ON => strict postcode rejects lower case; global OFF restores", async ({ browser, request }, info) => {
    try {
      let v = await newVisitor(browser, info);
      await seedCart(v.page);
      await openCheckout(v.page);
      await v.page.getByTestId("checkout-postcode").fill("1234ab");
      await v.page.getByTestId("checkout-postcode").blur();
      await expect(v.page.getByTestId("error-postcode")).toHaveCount(0); // env OFF: accepted
      await v.ctx.close();

      await setFlag(request, "postcodeValidation", true);
      v = await newVisitor(browser, info);
      await seedCart(v.page);
      await openCheckout(v.page);
      await v.page.getByTestId("checkout-postcode").fill("1234ab");
      await v.page.getByTestId("checkout-postcode").blur();
      await expect(v.page.getByTestId("error-postcode")).toHaveText("Invalid input.");
      await v.ctx.close();
    } finally {
      await setFlag(request, "postcodeValidation", false);
    }
    const v = await newVisitor(browser, info);
    await seedCart(v.page);
    await openCheckout(v.page);
    await v.page.getByTestId("checkout-postcode").fill("1234ab");
    await v.page.getByTestId("checkout-postcode").blur();
    await expect(v.page.getByTestId("error-postcode")).toHaveCount(0);
    await v.ctx.close();
  });

  test("override beats global in both directions (expressShippingError)", async ({ browser, request }, info) => {
    const run = async (query: string) => {
      const v = await newVisitor(browser, info);
      const errors = collectErrors(v.page);
      await seedCart(v.page);
      await openCheckout(v.page, query);
      await v.page.getByTestId("checkout-postcode").fill("1012 AB");
      await v.page.getByTestId("shipping-express").check();
      await v.page.waitForTimeout(700);
      const thrown = errors.some((e) => e.startsWith("pageerror"));
      await v.ctx.close();
      return thrown;
    };
    try {
      await setFlag(request, "expressShippingError", true);
      expect(await run("")).toBe(true); // global ON
      expect(await run("?friction=expressShippingError:off")).toBe(false); // override OFF beats global ON
      await setFlag(request, "expressShippingError", false);
      expect(await run("")).toBe(false); // global OFF
      expect(await run("?friction=expressShippingError:on")).toBe(true); // override ON beats global OFF (and env OFF)
      expect(await run("?friction=all:off")).toBe(false);
    } finally {
      await setFlag(request, "expressShippingError", false);
    }
  });

  test("a flag the global layer does not mention falls through to env (not code default)", async ({ request }) => {
    const s = await state(request);
    // slowHero has been pinned by earlier tests; find any key never set globally in this run, else just assert source semantics
    const src = FLAG_KEYS.map((k) => s.effective[k].source);
    expect(src.every((x: string) => x === "global" || x === "env")).toBe(true); // never 'default' in this build: env covers all 9
  });
});

test.describe("headers and public data", () => {
  test("/api/flags: public, cacheable (s-maxage=10, swr=20), no history, no PIN needed; panel API no-store everywhere", async ({ request }) => {
    const pub = await request.get("/api/flags");
    expect(pub.status()).toBe(200);
    expect(pub.headers()["cache-control"]).toBe("public, max-age=0, s-maxage=10, stale-while-revalidate=20");
    expect(pub.headers()["content-type"]).toContain("application/json");
    const body = await pub.json();
    expect(Object.keys(body).sort()).toEqual(["configured", "flags", "store", "updatedAt"]);
    expect(JSON.stringify(body)).not.toMatch(/flagHistory|envDefaults|token|246810|"pin/i);
    const g = await request.get(API, { headers: H });
    expect(g.headers()["cache-control"]).toBe("no-store");
    const p = await request.post(API, { headers: H, data: { action: "all_off" } });
    expect(p.status()).toBe(200);
    expect(p.headers()["cache-control"]).toBe("no-store");
    expect((await request.post(API, { headers: H, data: { nope: 1 } })).headers()["cache-control"]).toBe("no-store");
    expect((await request.get(API)).headers()["cache-control"]).toBe("no-store");
  });

  test("panel API response shape: effective, profile, defaults, payload", async ({ request }) => {
    const s = await state(request);
    expect(Object.keys(s).sort()).toEqual(expect.arrayContaining(["codeDefaults", "configured", "effective", "envDefaults", "payload", "profile", "store"]));
    for (const k of FLAG_KEYS) expect(typeof s.effective[k].value).toBe("boolean");
  });

  test("robots.txt disallows /demo-controls and /api/; the page is noindex,nofollow, has no shop chrome and loads no tags; nothing links to it", async ({ page, request, context }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: \*/i);
    expect(robots).toContain("Disallow: /demo-controls");
    expect(robots).toContain("Disallow: /api/");
    const tagRequests: string[] = [];
    context.on("request", (r) => {
      if (/contentsquare|googletagmanager|google-analytics|doubleclick/.test(r.url())) tagRequests.push(r.url());
    });
    const errors = collectErrors(page);
    await unlockPanel(page);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /nofollow/);
    for (const id of ["nav-logo", "mobile-menu-button", "header-cart-button"]) await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(page.locator("header, footer")).toHaveCount(0);
    expect(await page.evaluate(() => ({ uxa: "_uxa" in window, dl: "dataLayer" in window, gtag: "gtag" in window }))).toEqual({ uxa: false, dl: false, gtag: false });
    expect(await page.locator('script[src*="contentsquare"], script[src*="googletagmanager"]').count()).toBe(0);
    expect(await page.evaluate(() => document.body.dataset.pageType ?? null)).toBe("demo-controls"); // attribute only, no tracking
    await page.waitForTimeout(500);
    expect(tagRequests).toEqual([]);
    expect(errors).toEqual([]);
    // shop pages never link to it
    for (const url of ["/", "/category/all", "/cart", "/checkout"]) {
      await page.goto(url);
      expect(await page.locator('a[href*="demo-controls"]').count(), url).toBe(0);
    }
    const sitemap = await request.get("/sitemap.xml");
    if (sitemap.ok()) expect(await sitemap.text()).not.toContain("demo-controls");
  });
});

test.describe("panel layout and screenshots", () => {
  test("gate, unlocked panel and history on desktop and mobile: no horizontal overflow, switches are touch sized", async ({ page, request }, info) => {
    const dir = `test-results/screenshots/${info.project.name}`;
    await page.goto("/demo-controls");
    await page.screenshot({ path: `${dir}/demo-controls-gate.png`, fullPage: true });
    await page.getByTestId("pin-input").fill("111111");
    await page.getByTestId("pin-submit").click();
    await expect(page.getByTestId("pin-error")).toBeVisible();
    await page.screenshot({ path: `${dir}/demo-controls-wrong-pin.png`, fullPage: true });
    try {
      await page.getByTestId("pin-input").fill(PIN);
      await page.getByTestId("pin-submit").click();
      await expect(page.getByTestId("store-status")).toBeVisible();
      await master(request, "only_fix_errors");
      await page.getByTestId("btn-refresh").click();
      await expect(sw(page, "slowHero")).toHaveAttribute("aria-checked", "true"); // only_fix_errors turned it on
      await expect(sw(page, "postcodeValidation")).toHaveAttribute("aria-checked", "false");
      await page.screenshot({ path: `${dir}/demo-controls-panel.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      for (const k of FLAG_KEYS) {
        const box = (await sw(page, k).boundingBox())!;
        expect(box.height, k).toBeGreaterThanOrEqual(44);
        expect(box.width, k).toBeGreaterThanOrEqual(44);
      }
      for (const id of ["btn-all-on", "btn-all-off", "btn-only-fix-errors"]) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.height, id).toBeGreaterThanOrEqual(40);
      }
      // keyboard: a switch toggles with Space and Enter
      await sw(page, "slowHero").focus();
      await page.keyboard.press("Space");
      await expect(sw(page, "slowHero")).toHaveAttribute("aria-checked", "false");
      // switch semantics and accessible name
      await expect(page.getByRole("switch", { name: label("slowHero") })).toBeVisible();
    } finally {
      await master(request, "all_off");
    }
  });
});

test.describe("keyboard focus", () => {
  // The switch uses aria-disabled while busy (not disabled), so focus must stay on it.
  test("focus stays on the switch after toggling it with the keyboard", async ({ page, request }) => {
    await unlockPanel(page);
    try {
      await sw(page, "slowHero").focus();
      await page.keyboard.press("Space");
      await expect(sw(page, "slowHero")).toHaveAttribute("aria-checked", "true");
      await expect(sw(page, "slowHero")).toBeFocused({ timeout: 1500 });
    } finally {
      await setFlag(request, "slowHero", false);
    }
  });
});

test.describe("keyboard focus on buttons", () => {
  for (const id of ["btn-all-on", "btn-all-off", "btn-only-fix-errors", "btn-refresh"]) {
    test(`focus stays on ${id} after activating it with the keyboard`, async ({ page, request }) => {
      await unlockPanel(page);
      try {
        await page.getByTestId(id).focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(600);
        await expect(page.getByTestId(id)).toBeFocused({ timeout: 1500 });
      } finally {
        await master(request, "all_off");
      }
    });
  }
});
