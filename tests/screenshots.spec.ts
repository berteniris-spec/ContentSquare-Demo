import { expect, test } from "./fixtures";

const ROUTES: [string, string][] = [
  ["home", "/"],
  ["plp-all", "/category/all"],
  ["plp-bags", "/category/bags"],
  ["plp-apparel", "/category/apparel"],
  ["plp-accessories", "/category/accessories"],
  ["pdp-trailhead-28-backpack", "/product/trailhead-28-backpack"],
  ["pdp-storm-shell-jacket", "/product/storm-shell-jacket"],
  ["pdp-wool-beanie", "/product/wool-beanie"],
  ["cart", "/cart"],
  ["checkout", "/checkout"],
  ["confirmation", "/confirmation"],
  ["demo-controls", "/demo-controls"],
  ["404", "/product/not-a-product"],
];

for (const [name, path] of ROUTES) {
  test(`screenshot ${name}`, async ({ page }, info) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // No horizontal overflow at this viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    await page.screenshot({
      path: `test-results/screenshots/${info.project.name}/${name}.png`,
      fullPage: true,
    });
  });
}

test("screenshot mobile menu open", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  await page.goto("/");
  await page.getByTestId("mobile-menu-button").click();
  await page.screenshot({ path: `test-results/screenshots/mobile/menu-open.png` });
});

test("screenshot skip link focused", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.screenshot({ path: `test-results/screenshots/desktop/skip-link-focus.png` });
  await page.keyboard.press("Tab");
  await page.screenshot({ path: `test-results/screenshots/desktop/logo-focus.png` });
});

test("screenshot drawer open", async ({ page }, info) => {
  await page.goto("/product/field-tote");
  await page.getByTestId("pdp-qty-inc").click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("mini-cart")).toBeVisible();
  await page.waitForTimeout(400); // let the slide-in animation finish
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/drawer-open.png` });
});

test("screenshot PDP size error", async ({ page }, info) => {
  await page.goto("/product/merino-base-tee");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("pdp-size-error")).toBeVisible();
  await page.getByTestId("pdp-size-error").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/pdp-size-error.png` });
});

test("screenshot PLP sorted price-desc", async ({ page }, info) => {
  await page.goto("/category/all?sort=price-desc");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/plp-all-price-desc.png` });
});

const SEED = JSON.stringify({
  items: [
    { productId: "p09", slug: "storm-shell-jacket", name: "Storm shell jacket", colour: "sea", size: "M", unitPrice: 229, quantity: 1 },
    { productId: "p17", slug: "wool-beanie", name: "Wool beanie", colour: "rust", unitPrice: 29, quantity: 2 },
  ],
  promoCode: "DEMO10",
});

test("screenshot cart filled", async ({ page }, info) => {
  await page.goto("/");
  await page.evaluate((v) => localStorage.setItem("tw-cart-v1", v), SEED);
  await page.goto("/cart");
  await expect(page.getByTestId("cart-total")).toBeVisible();
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/cart-filled.png`, fullPage: true });
});

test("screenshot checkout with errors", async ({ page }, info) => {
  await page.goto("/");
  await page.evaluate((v) => localStorage.setItem("tw-cart-v1", v), SEED);
  await page.goto("/checkout");
  await page.getByTestId("checkout-email").fill("bad");
  await page.getByTestId("checkout-postcode").fill("12");
  await page.getByTestId("checkout-submit").click();
  await expect(page.getByTestId("error-email")).toBeVisible();
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/checkout-errors.png`, fullPage: true });
});

test("screenshot confirmation with order", async ({ page }, info) => {
  await page.goto("/");
  await page.evaluate((v) => localStorage.setItem("tw-cart-v1", v), SEED);
  await page.goto("/checkout");
  const vals: Record<string, string> = { email: "hiker@example.com", firstName: "Ada", lastName: "Trail", address: "Kade 1", city: "Amsterdam", postcode: "1234 AB", cardNumber: "4242 4242 4242 4242", cardExpiry: "12/30", cardCvc: "123" };
  for (const [k, v] of Object.entries(vals)) await page.getByTestId(`checkout-${k}`).fill(v);
  await page.getByTestId("checkout-submit").click();
  await expect(page.getByTestId("checkout-processing")).toBeVisible();
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/checkout-processing.png` });
  await expect(page.getByTestId("confirmation-order-number")).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `test-results/screenshots/${info.project.name}/confirmation-order.png`, fullPage: true });
});
