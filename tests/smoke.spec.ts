import { CATEGORIES, PRODUCTS } from "../lib/products";
import { expect, test } from "./fixtures";

const STATIC_ROUTES = ["/", "/cart", "/checkout", "/confirmation", "/demo-controls"];
const CATEGORY_ROUTES = CATEGORIES.map((c) => `/category/${c.slug}`);
const PRODUCT_ROUTES = PRODUCTS.map((p) => `/product/${p.slug}`);

test.describe("route smoke", () => {
  test("catalog has 24 products and 4 category routes", () => {
    expect(PRODUCTS).toHaveLength(24);
    expect(CATEGORY_ROUTES.sort()).toEqual(
      ["/category/accessories", "/category/all", "/category/apparel", "/category/bags"].sort(),
    );
  });

  for (const path of [...STATIC_ROUTES, ...CATEGORY_ROUTES, ...PRODUCT_ROUTES]) {
    test(`200 ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main#main")).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }

  for (const path of [
    "/category/shoes",
    "/category/BAGS",
    "/product/not-a-product",
    "/product/field-tote-x",
    "/this-route-does-not-exist",
  ]) {
    test(`404 ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(page.getByText("404")).toBeVisible();
      // Branded 404 keeps the shop chrome.
      await expect(page.getByTestId("nav-logo")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("category pages list the right number of products", async ({ page }) => {
    for (const c of CATEGORIES) {
      await page.goto(`/category/${c.slug}`);
      const n = c.slug === "all" ? 24 : PRODUCTS.filter((p) => p.category === c.slug).length;
      await expect(page.getByTestId("plp-grid").locator(":scope > *")).toHaveCount(n);
      await expect(page.getByTestId("plp-title")).toHaveText(c.name);
    }
  });

  test("product page shows name and price", async ({ page }) => {
    const p = PRODUCTS[0];
    await page.goto(`/product/${p.slug}`);
    await expect(page.getByTestId("pdp-name")).toHaveText(p.name);
    await expect(page.getByTestId("pdp-price")).toContainText(String(p.price));
    await expect(page.getByTestId("pdp-gallery-main").locator("svg").first()).toBeVisible();
  });
});
