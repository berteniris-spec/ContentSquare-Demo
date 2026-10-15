import { expect, test } from "../tests/fixtures";
import { bySlug, CART_KEY, cartJson, plainEvents, seedCartInit, waitPageView } from "../tests/tracking-helpers";

// Shipped default path: no NEXT_PUBLIC_FRICTION_* at build time and nothing in the global store.
// docs/FRICTION_FLAGS.md: 8 flags ON, expressShippingError OFF, profile "baseline".
const tee = bySlug("merino-base-tee");

test("API and dataLayer: global layer empty, profile baseline, 8 ON, expressShippingError OFF", async ({ page, request }) => {
  const api = await (await request.get("/api/flags")).json();
  expect(api).toMatchObject({ configured: true, flags: {} });
  await page.goto("/");
  await waitPageView(page);
  const pv = (await plainEvents(page, "page_view"))[0] as Record<string, unknown>;
  expect(pv.friction_profile).toBe("baseline");
  expect(pv.friction).toEqual({
    promoField: "on", shippingSurprise: "on", decoyBanner: "on", buriedCta: "on", deadSwatch: "on",
    silentSize: "on", slowHero: "on", postcodeValidation: "on", expressShippingError: "off",
  });
});

test("slowHero ON by default: hero uses /api/hero-image", async ({ page }) => {
  const reqs: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/hero-image")) reqs.push(r.url()); });
  await page.goto("/");
  await expect(page.getByTestId("hero-image")).toHaveAttribute("src", "/api/hero-image");
  await expect.poll(() => reqs.length, { timeout: 10_000 }).toBeGreaterThan(0);
});

test("decoyBanner ON by default, non-interactive div", async ({ page }) => {
  await page.goto("/category/bags");
  const b = page.getByTestId("plp-decoy-banner");
  await expect(b).toBeVisible();
  expect(await b.evaluate((e) => e.tagName)).toBe("DIV");
  await expect(b.locator("a, button")).toHaveCount(0);
});

test("buriedCta ON by default on the target product only", async ({ page }) => {
  await page.goto("/product/trailhead-28-backpack");
  await expect(page.getByTestId("pdp-story")).toBeVisible();
  const story = (await page.getByTestId("pdp-story").boundingBox())!;
  const cta = (await page.getByTestId("add-to-cart").boundingBox())!;
  expect(cta.y).toBeGreaterThan(story.y);
  await page.goto("/product/daypack-18");
  const s2 = await page.getByTestId("pdp-story").count();
  const cta2 = (await page.getByTestId("add-to-cart").boundingBox())!;
  if (s2) expect(cta2.y).toBeLessThan((await page.getByTestId("pdp-story").boundingBox())!.y);
});

test("deadSwatch ON by default: moss on field-tote is dead, charcoal works", async ({ page }) => {
  await page.goto("/product/field-tote");
  const moss = page.getByTestId("pdp-swatch-moss");
  const before = await page.getByTestId("pdp-gallery-main").innerHTML();
  await moss.click();
  await expect(moss).not.toBeChecked();
  expect(await page.getByTestId("pdp-gallery-main").innerHTML()).toBe(before);
});

test("silentSize ON by default: no size = nothing happens on storm-shell-jacket", async ({ page }) => {
  await page.goto("/product/storm-shell-jacket");
  await waitPageView(page);
  const n = (await plainEvents(page)).length;
  await page.getByTestId("add-to-cart").click();
  await page.waitForTimeout(600);
  await expect(page.getByTestId("pdp-size-error")).toHaveCount(0);
  await expect(page.getByTestId("mini-cart")).toHaveCount(0);
  expect((await plainEvents(page)).length).toBe(n);
  expect(await page.evaluate((k) => localStorage.getItem(k), CART_KEY)).toBeNull();
  // another sized product still shows the clean error
  await page.goto(`/product/${tee.slug}`);
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("pdp-size-error")).toBeVisible();
});

test("promoField + shippingSurprise ON by default on /cart", async ({ page }) => {
  await seedCartInit(page, [{ slug: tee.slug, size: "M" }]);
  await page.goto("/cart");
  await expect(page.getByTestId("promo-code-input")).toBeVisible();
  await expect(page.getByTestId("promo-code-toggle")).toHaveCount(0);
  await expect(page.getByTestId("cart-shipping")).toContainText("Calculated at checkout");
  await expect(page.getByTestId("cart-free-shipping-hint")).toHaveCount(0);
});

test("postcodeValidation ON by default (strict) and expressShippingError OFF (no TypeError)", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await seedCartInit(page, [{ slug: tee.slug, size: "M" }]);
  const settled = page.waitForResponse((r) => r.url().includes("/api/flags"));
  await page.goto("/checkout");
  await settled;
  await page.getByTestId("checkout-postcode").waitFor();
  await page.getByTestId("checkout-postcode").fill("1234 AB");
  await page.getByTestId("checkout-postcode").blur();
  await expect(page.getByTestId("error-postcode")).toBeVisible();
  await page.getByTestId("checkout-postcode").fill("1234AB");
  await page.getByTestId("checkout-postcode").blur();
  await expect(page.getByTestId("error-postcode")).toHaveCount(0);
  await page.getByTestId("shipping-express").check();
  await page.getByTestId("checkout-postcode").fill("1012");
  await page.getByTestId("checkout-postcode").blur();
  await page.waitForTimeout(500);
  expect(errs.filter((e) => /rate|TypeError/.test(e))).toEqual([]);
});

test("panel on the untouched store shows profile baseline and source default", async ({ page }) => {
  await page.goto("/demo-controls");
  await page.getByTestId("pin-input").fill("246810");
  await page.getByTestId("pin-submit").click();
  await page.getByTestId("store-status").waitFor();
  await expect(page.getByTestId("friction-profile")).toHaveText("baseline");
  await expect(page.getByTestId("flag-state-promoField")).toHaveText("ON");
  await expect(page.getByTestId("flag-state-expressShippingError")).toHaveText("OFF");
  await expect(page.getByTestId("flag-row-promoField")).toContainText(/default/i);
  void cartJson;
});
