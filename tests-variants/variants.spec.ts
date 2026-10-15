import { expect, test } from "../tests/fixtures";
import {
  bySlug, gtagEntries, gtagEvents, payAndConfirm, plainEvents, readDL, uxa, waitPageView,
} from "../tests/tracking-helpers";

const VARIANT = process.env.VARIANT ?? "disabled";
const tee = bySlug("merino-base-tee");

const ROUTES = ["/", "/category/bags", "/product/field-tote", "/cart", "/checkout", "/confirmation", "/nope-404"];

async function journey(page: import("@playwright/test").Page) {
  await page.goto(`/product/${tee.slug}`);
  await page.getByTestId("pdp-size-M").click();
  await page.getByTestId("add-to-cart").click();
  await page.getByTestId("mini-cart-view-cart").click();
  await page.getByTestId("proceed-to-checkout").click();
  await expect(page).toHaveURL(/\/checkout$/);
  await payAndConfirm(page);
}

test.describe(`variant ${VARIANT}`, () => {
  test("tags: expected presence on every route", async ({ page, csRequests, gaRequests }) => {
    const wantGa = VARIANT === "override" || VARIANT === "dev";
    const wantCs = VARIANT === "override" || VARIANT === "dev";
    const gaUrl = VARIANT === "override" ? "https://www.googletagmanager.com/gtag/js?id=G-TESTOVER12" : "https://www.googletagmanager.com/gtag/js?id=G-4PLJ26X0Y9";
    const csUrl = VARIANT === "override" ? "https://t.contentsquare.net/uxa/abc123def456.js" : "https://t.contentsquare.net/uxa/506730812ef03.js";
    for (const path of ROUTES) {
      csRequests.length = 0;
      gaRequests.length = 0;
      await page.goto(path);
      await page.waitForTimeout(1200);
      const st = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        return { gtag: typeof w.gtag, init: w.__gaInit, uxa: w._uxa, dl: (w.dataLayer as unknown[] | undefined)?.length ?? 0 };
      });
      if (wantGa) {
        expect(gaRequests.map((r) => r.url()), path).toEqual([gaUrl]);
        await expect(page.locator("script#ga-src"), path).toHaveCount(1);
        expect(st.gtag, path).toBe("function");
        const g = await gtagEntries(page);
        expect(g.filter((a) => a[0] === "config"), path).toEqual([["config", VARIANT === "override" ? "G-TESTOVER12" : "G-4PLJ26X0Y9"]]);
      } else {
        expect(gaRequests, path).toHaveLength(0);
        await expect(page.locator("script#ga-src, script[src*='googletagmanager.com']"), path).toHaveCount(0);
        expect(st.gtag, path).toBe("undefined");
        expect(st.init, path).toBeUndefined();
        const g = await gtagEntries(page);
        expect(g, path).toEqual([]);
      }
      if (wantCs) {
        expect(csRequests.map((r) => r.url()), path).toEqual([csUrl]);
      } else {
        expect(csRequests, path).toHaveLength(0);
        await expect(page.locator("script#cs-src, script#cs-init, script[src*='contentsquare']"), path).toHaveCount(0);
        expect(st.uxa, path).toBeUndefined();
      }
      await expect(page.locator("body"), path).toHaveAttribute("data-page-type", /.+/);
    }
  });

  test("shop, plain dataLayer events and page types still work; purchase once", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await journey(page);
    await expect.poll(async () => (await plainEvents(page, "purchase")).length).toBe(1);
    // view_item is covered by the Strict Mode test for the dev variant.
    for (const n of VARIANT === "dev" ? ["add_to_cart", "begin_checkout"] : ["view_item", "add_to_cart", "begin_checkout"]) expect((await plainEvents(page, n)).length, n).toBe(1);
    expect((await plainEvents(page, "page_view")).length).toBeGreaterThanOrEqual(3);
    const wantGa = VARIANT === "override" || VARIANT === "dev";
    const ge = await gtagEvents(page);
    if (wantGa) expect(ge.map((e) => e.name).filter((n, i, a) => a.indexOf(n) === i)).toEqual(["view_item", "add_to_cart", "begin_checkout", "purchase"]);
    else expect(ge).toEqual([]);
    const u = await uxa(page);
    if (VARIANT === "disabled") expect(u).toEqual([]);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("demo-controls has neither tag in any variant", async ({ page, csRequests, gaRequests }) => {
    await page.goto("/demo-controls");
    await page.waitForTimeout(1200);
    expect(csRequests).toHaveLength(0);
    expect(gaRequests).toHaveLength(0);
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "demo-controls");
  });

  test("CS _uxa state", async ({ page }) => {
    await page.goto("/");
    await waitPageView(page, 1);
    const u = await uxa(page);
    const dyn = u.filter((c) => c[0] === "trackDynamicVariable");
    if (VARIANT === "disabled" || VARIANT === "invalid") expect(u).toEqual([]);
    else expect(dyn).toHaveLength(10);
  });
});

test.describe("React Strict Mode (next dev)", () => {
  test.skip(VARIANT !== "dev", "dev variant only");

  test("each business event, page_view, js/config and order_value fire once", async ({ page }) => {
    await page.goto("/");
    await waitPageView(page, 1);
    await page.waitForTimeout(500);
    expect((await plainEvents(page, "page_view")).length, "home page_view").toBe(1);
    await page.goto(`/product/${tee.slug}`);
    await waitPageView(page, 1);
    await page.getByTestId("pdp-size-M").click();
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("mini-cart-view-cart").click();
    await page.getByTestId("proceed-to-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await payAndConfirm(page);
    await page.waitForTimeout(1000);
    for (const n of ["view_item", "add_to_cart", "begin_checkout", "purchase"]) {
      expect.soft((await plainEvents(page, n)).length, `plain ${n}`).toBe(1);
      expect.soft((await gtagEvents(page, n)).length, `gtag ${n}`).toBe(1);
    }
    const pvPaths = (await plainEvents(page, "page_view")).map((e) => e.page_path);
    expect.soft(pvPaths, "page_view each location once").toEqual([...new Set(pvPaths)]);
    const dl = await readDL(page);
    expect(dl.filter((d) => d.kind === "gtag" && d.args[0] === "js")).toHaveLength(1);
    expect(dl.filter((d) => d.kind === "gtag" && d.args[0] === "config")).toHaveLength(1);
    const ov = (await uxa(page)).filter((c) => c[0] === "trackDynamicVariable" && (c[1] as { key: string }).key === "order_value");
    expect(ov).toHaveLength(1);
  });
});
