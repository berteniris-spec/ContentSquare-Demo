import { PRODUCTS } from "../lib/products";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

// Builder smoke checks for M4. The Tester owns the full friction suite.
// Build-time env defaults are all OFF in playwright.config.ts; overrides flip flags per test.
const bySlug = (s: string) => PRODUCTS.find((p) => p.slug === s)!;

async function seedCart(page: Page, slug: string, qty = 1, size?: string) {
  const p = bySlug(slug);
  await page.goto("/");
  await page.evaluate(
    (cart) => localStorage.setItem("tw-cart-v1", cart),
    JSON.stringify({
      items: [{ productId: p.id, slug, name: p.name, colour: p.colours[0].slug, size, unitPrice: p.price, quantity: qty }],
      promoCode: null,
    }),
  );
}

test("decoy banner: ON renders a non-interactive div, OFF renders nothing", async ({ page }) => {
  await page.goto("/category/bags?friction=decoyBanner:on");
  const banner = page.getByTestId("plp-decoy-banner");
  await expect(banner).toBeVisible();
  expect(await banner.evaluate((el) => el.tagName)).toBe("DIV");
  await page.goto("/category/bags?friction=decoyBanner:off");
  await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
});

test("overrides persist in the session; all:off and reset work", async ({ page }) => {
  await page.goto("/category/bags?friction=decoyBanner:on");
  await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
  await page.goto("/category/apparel");
  await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
  await page.goto("/category/apparel?friction=all:off");
  await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
  await page.goto("/category/apparel?friction=reset");
  await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0); // env default is OFF in tests
});

test("slowHero: OFF requests only hero.svg; ON requests /api/hero-image", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (r) => urls.push(new URL(r.url()).pathname));
  await page.goto("/?friction=slowHero:off");
  await expect(page.getByTestId("hero-image")).toHaveAttribute("src", "/images/hero.svg");
  expect(urls).not.toContain("/api/hero-image");
  await page.goto("/?friction=slowHero:on");
  await expect(page.getByTestId("hero-image")).toHaveAttribute("src", "/api/hero-image");
});

test("deadSwatch and silentSize", async ({ page }) => {
  await page.goto("/product/field-tote?friction=deadSwatch:on");
  await page.getByTestId("pdp-swatch-charcoal").click();
  await expect(page.getByTestId("pdp-swatch-charcoal")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("pdp-swatch-moss").click();
  await expect(page.getByTestId("pdp-swatch-charcoal")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("pdp-swatch-moss")).toHaveAttribute("aria-checked", "false");

  await page.goto("/product/storm-shell-jacket?friction=silentSize:on");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("pdp-size-error")).toHaveCount(0);
  await expect(page.getByTestId("mini-cart")).toHaveCount(0);
  await page.goto("/product/storm-shell-jacket?friction=silentSize:off");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("pdp-size-error")).toBeVisible();
});

test("buriedCta: Add to cart sits below the story only when ON", async ({ page }) => {
  await page.goto("/product/trailhead-28-backpack?friction=buriedCta:on");
  const story = await page.getByTestId("pdp-story").boundingBox();
  const cta = await page.getByTestId("add-to-cart").boundingBox();
  expect(cta!.y).toBeGreaterThan(story!.y + story!.height);
  await page.goto("/product/trailhead-28-backpack?friction=buriedCta:off");
  const story2 = await page.getByTestId("pdp-story").boundingBox();
  const cta2 = await page.getByTestId("add-to-cart").boundingBox();
  expect(cta2!.y).toBeLessThan(story2!.y);
});

test("promoField and shippingSurprise", async ({ page }) => {
  await seedCart(page, "hip-pack");
  await page.goto("/cart?friction=promoField:on,shippingSurprise:on");
  await expect(page.getByTestId("promo-code-input")).toBeVisible();
  await expect(page.getByTestId("promo-code-toggle")).toHaveCount(0);
  await expect(page.getByTestId("cart-shipping")).toHaveText("Calculated at checkout");
  await expect(page.getByTestId("cart-total")).toHaveText("€45.00");
  await page.goto("/cart?friction=promoField:off,shippingSurprise:off");
  await expect(page.getByTestId("promo-code-toggle")).toBeVisible();
  await expect(page.getByTestId("cart-shipping")).toHaveText("€6.95");
});

test("postcodeValidation: strict rejects 1234 AB with 'Invalid input.'", async ({ page }) => {
  await seedCart(page, "hip-pack");
  await page.goto("/checkout?friction=postcodeValidation:on");
  const pc = page.getByTestId("checkout-postcode");
  await pc.fill("1234 AB");
  await pc.blur();
  await expect(page.getByTestId("error-postcode")).toHaveText("Invalid input.");
  await pc.fill("1234AB");
  await pc.blur();
  await expect(page.getByTestId("error-postcode")).toHaveCount(0);
  await page.goto("/checkout?friction=postcodeValidation:off");
  await pc.fill("1234 ab");
  await pc.blur();
  await expect(page.getByTestId("error-postcode")).toHaveCount(0);
});

test("expressShippingError: throws only when ON, Standard clears it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedCart(page, "hip-pack");
  await page.goto("/checkout?friction=expressShippingError:on");
  await page.getByTestId("checkout-postcode").fill("1012 AB");
  await page.getByTestId("shipping-express").check();
  await expect.poll(() => errors.length).toBeGreaterThan(0);
  expect(errors[0]).toContain("rate");
  await expect(page.getByTestId("shipping-express")).toBeChecked();
  await expect(page.getByTestId("checkout-summary-shipping")).not.toHaveText("€12.95");
  const before = errors.length;
  await page.getByTestId("checkout-submit").click();
  await expect.poll(() => errors.length).toBeGreaterThan(before);
  await page.getByTestId("shipping-standard").check();
  await expect(page.getByTestId("shipping-standard")).toBeChecked();

  errors.length = 0;
  await page.goto("/checkout?friction=expressShippingError:off");
  await page.getByTestId("checkout-postcode").fill("1012 AB");
  await page.getByTestId("shipping-express").check();
  await expect(page.getByTestId("checkout-summary-shipping")).toHaveText("€12.95");
  expect(errors).toHaveLength(0);
});
