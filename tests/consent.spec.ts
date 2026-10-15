import { expect, test } from "./fixtures";

// No seeded consent: this file exercises the banner itself.
test.use({ storageState: { cookies: [], origins: [] } });

const TAG_SELECTOR = 'script[src*="googletagmanager"], script[src*="contentsquare"]';
const tagCount = (page: import("@playwright/test").Page) => page.locator(TAG_SELECTOR).count();

test.describe("cookie consent", () => {
  test("banner shows, no tags or requests before consent", async ({ page, csRequests, gaRequests }) => {
    await page.goto("/");
    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("role", "region");
    await expect(banner).toHaveAccessibleName("Cookie consent");
    await expect(page.getByTestId("cookie-accept")).toBeVisible();
    await expect(page.getByTestId("cookie-decline")).toBeVisible();
    // Not stealing focus on load.
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.waitForTimeout(800);
    expect(await tagCount(page)).toBe(0);
    expect(csRequests).toHaveLength(0);
    expect(gaRequests).toHaveLength(0);
    expect(await page.evaluate(() => "dataLayer" in window || "gtag" in window)).toBe(false);
  });

  test("touch targets are at least 44px", async ({ page }) => {
    await page.goto("/");
    for (const id of ["cookie-accept", "cookie-decline"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test("Accept loads both tags, hides the banner and persists", async ({ page, csRequests, gaRequests }) => {
    await page.goto("/");
    await page.getByTestId("cookie-accept").click();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    await expect.poll(() => tagCount(page)).toBeGreaterThanOrEqual(2);
    await expect.poll(() => csRequests.length).toBeGreaterThan(0);
    await expect.poll(() => gaRequests.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => localStorage.getItem("tw-consent"))).toBe("accepted");

    await page.reload();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    await expect.poll(() => tagCount(page)).toBeGreaterThanOrEqual(2);
  });

  test("Decline keeps tags off and persists", async ({ page, csRequests, gaRequests }) => {
    await page.goto("/");
    await page.getByTestId("cookie-decline").click();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("tw-consent"))).toBe("declined");
    await page.reload();
    await page.goto("/category/all");
    await page.waitForTimeout(800);
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    expect(await tagCount(page)).toBe(0);
    expect(csRequests).toHaveLength(0);
    expect(gaRequests).toHaveLength(0);
    expect(await page.evaluate(() => "dataLayer" in window)).toBe(false);
  });

  test("no banner and no tags on /demo-controls", async ({ page, csRequests, gaRequests }) => {
    await page.goto("/demo-controls");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
    expect(await tagCount(page)).toBe(0);
    expect(csRequests).toHaveLength(0);
    expect(gaRequests).toHaveLength(0);
  });

  test("keyboard focus never lands under the banner (PDP, 390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { PRODUCTS } = await import("../lib/products");
    await page.goto(`/product/${PRODUCTS[0].slug}`);
    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toBeVisible();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const hit = await page.evaluate(() => {
        const b = document.querySelector('[data-testid="cookie-banner"]')!.getBoundingClientRect();
        const a = document.activeElement;
        if (!a || a === document.body || a.closest('[data-testid="cookie-banner"]')) return false;
        const r = a.getBoundingClientRect();
        return r.bottom > b.top && r.top < b.bottom;
      });
      expect(hit).toBe(false);
    }
  });

  test("banner does not cover the PDP add-to-cart button on mobile", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile only");
    await page.goto("/product/" + (await firstSlug(page)));
    const banner = await page.getByTestId("cookie-banner").boundingBox();
    expect(banner!.height).toBeLessThan(260);
    await page.getByTestId("add-to-cart").scrollIntoViewIfNeeded();
    await page.getByTestId("add-to-cart").click({ trial: true });
  });
});

async function firstSlug(page: import("@playwright/test").Page) {
  const { PRODUCTS } = await import("../lib/products");
  void page;
  return PRODUCTS[0].slug;
}
