import { CATEGORIES, PRODUCTS, getFeatured, getRelated, sortProducts, type Product } from "../lib/products";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

const CART_KEY = "tw-cart-v1";
const isMobile = (n: string) => n === "mobile";

async function gridSlugs(page: Page) {
  return page
    .getByTestId("plp-grid")
    .locator('[data-testid^="product-card-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.replace("product-card-", "")));
}
const slugs = (ps: Product[]) => ps.map((p) => p.slug);
const inCat = (slug: string) => (slug === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === slug));
const readCart = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), CART_KEY);

test.describe("homepage", () => {
  test("hero, tiles, featured, values, newsletter", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero").locator("h1")).toBeVisible();
    await expect(page.getByTestId("hero-image")).toBeVisible();
    await expect(page.getByTestId("hero-cta")).toHaveAttribute("href", "/category/all");
    for (const c of ["bags", "apparel", "accessories"]) {
      await expect(page.getByTestId(`category-tile-${c}`)).toHaveAttribute("href", `/category/${c}`);
    }
    const featured = page.getByTestId("featured-row").locator('[data-testid^="product-card-"]');
    expect(await featured.count()).toBeGreaterThanOrEqual(4);
    expect(getFeatured().length).toBeGreaterThanOrEqual(6);
    const valueItems = await page.getByTestId("values-strip").locator("li").count();
    expect(valueItems).toBeGreaterThanOrEqual(3);
    expect(valueItems).toBeLessThanOrEqual(4);
  });

  test("hero CTA -> PLP -> PDP", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-cta").click();
    await expect(page).toHaveURL(/\/category\/all$/);
    await page.getByTestId("product-card-field-tote").click();
    await expect(page).toHaveURL(/\/product\/field-tote$/);
    await expect(page.getByTestId("pdp-name")).toHaveText("Field tote");
  });

  test("newsletter: empty and invalid show errors, valid shows thank-you without network", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Ignore Next.js Link prefetches (?_rsc=); anything else (POST, third-party) means the form hit the network.
    const reqs: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "GET" && (r.url().includes("_rsc=") || r.url().includes("/_next/"))) return;
      reqs.push(`${r.method()} ${r.url()}`);
    });
    const email = page.getByTestId("newsletter-email");
    await expect(email).toHaveAccessibleName("Email address");
    await page.getByTestId("newsletter-submit").click();
    await expect(page.getByTestId("newsletter-error")).toBeVisible();
    await email.fill("not-an-email");
    await page.getByTestId("newsletter-submit").click();
    await expect(page.getByTestId("newsletter-error")).toContainText(/email/i);
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("newsletter-thanks")).toHaveCount(0);
    await email.fill("hiker@example.com");
    await page.getByTestId("newsletter-submit").click();
    await expect(page.getByTestId("newsletter-thanks")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(reqs).toEqual([]);
  });
});

test.describe("PLP", () => {
  test("cards: name, price, colour count, link", async ({ page }) => {
    await page.goto("/category/bags");
    await expect(page.getByTestId("plp-count")).toHaveText("8 products");
    const p = PRODUCTS.find((x) => x.slug === "field-tote")!;
    const card = page.getByTestId("product-card-field-tote");
    await expect(card).toHaveAttribute("href", "/product/field-tote");
    await expect(card).toContainText(p.name);
    await expect(card).toContainText(`€${p.price}.00`);
    await expect(card).toContainText(`${p.colours.length} colours`);
    await page.goto("/category/all");
    await expect(page.getByTestId("plp-count")).toHaveText("24 products");
  });

  for (const c of CATEGORIES) {
    test(`default order is featured: ${c.slug}`, async ({ page }) => {
      await page.goto(`/category/${c.slug}`);
      await expect(page.getByTestId("plp-sort")).toHaveValue("featured");
      expect(await gridSlugs(page)).toEqual(slugs(sortProducts(inCat(c.slug), "featured")));
    });
  }

  test("sort via UI updates order and ?sort= without scroll jump", async ({ page }) => {
    await page.goto("/category/all");
    const sort = page.getByTestId("plp-sort");
    await expect(sort).toHaveAccessibleName("Sort by");
    await expect(sort).toBeEnabled();
    await page.evaluate(() => window.scrollTo(0, 300));
    const before = await page.evaluate(() => window.scrollY);
    await sort.selectOption("price-asc");
    await expect(page).toHaveURL(/\?sort=price-asc$/);
    await expect.poll(() => gridSlugs(page)).toEqual(slugs(sortProducts(PRODUCTS, "price-asc")));
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await sort.selectOption("price-desc");
    await expect(page).toHaveURL(/\?sort=price-desc$/);
    await expect.poll(() => gridSlugs(page)).toEqual(slugs(sortProducts(PRODUCTS, "price-desc")));
    await sort.selectOption("featured");
    await expect(page).toHaveURL(/\?sort=featured$/);
    await expect.poll(() => gridSlugs(page)).toEqual(slugs(sortProducts(PRODUCTS, "featured")));
    // router.replace: no history entries were added.
    await page.goBack();
    await expect(page).not.toHaveURL(/category\/all/);
  });

  test("?sort= URL renders that order; invalid falls back to featured", async ({ page }) => {
    for (const s of ["price-desc", "price-asc"] as const) {
      await page.goto(`/category/apparel?sort=${s}`);
      await expect(page.getByTestId("plp-sort")).toHaveValue(s);
      await expect.poll(() => gridSlugs(page)).toEqual(slugs(sortProducts(inCat("apparel"), s)));
    }
    await page.goto("/category/apparel?sort=banana");
    await expect(page.getByTestId("plp-sort")).toHaveValue("featured");
    await expect.poll(() => gridSlugs(page)).toEqual(slugs(sortProducts(inCat("apparel"), "featured")));
  });
});

test.describe("PDP", () => {
  test("gallery thumbnails switch main view; swatches change colour", async ({ page }) => {
    const p = PRODUCTS.find((x) => x.slug === "trailhead-28-backpack")!;
    await page.goto(`/product/${p.slug}`);
    const main = page.getByTestId("pdp-gallery-main").getByRole("img");
    await expect(main).toHaveAccessibleName(`${p.name} in ${p.colours[0].name}, ${p.views[0]} view`);
    expect(p.views.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < p.views.length; i++) {
      const thumb = page.getByTestId(`pdp-thumb-${i}`);
      await expect(thumb).toHaveAccessibleName(new RegExp(p.views[i], "i"));
      await thumb.click();
      await expect(thumb).toHaveAttribute("aria-pressed", "true");
      await expect(main).toHaveAccessibleName(`${p.name} in ${p.colours[0].name}, ${p.views[i]} view`);
    }
    await expect(page.getByTestId(`pdp-thumb-${p.views.length}`)).toHaveCount(0);

    const c2 = p.colours[1];
    const sw = page.getByTestId(`pdp-swatch-${c2.slug}`);
    await expect(page.getByRole("radiogroup", { name: "Colour" })).toBeVisible();
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId(`pdp-swatch-${p.colours[0].slug}`)).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText(`Colour: ${c2.name}`)).toBeVisible();
    await expect(main).toHaveAccessibleName(new RegExp(`in ${c2.name},`));
    // Keyboard: arrow moves selection.
    await sw.focus();
    await page.keyboard.press("ArrowRight");
    const c3 = p.colours[2 % p.colours.length];
    await expect(page.getByTestId(`pdp-swatch-${c3.slug}`)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId(`pdp-swatch-${c3.slug}`)).toBeFocused();
  });

  test("quantity stepper bounds 1..10", async ({ page }) => {
    await page.goto("/product/wool-beanie");
    const dec = page.getByTestId("pdp-qty-dec");
    const inc = page.getByTestId("pdp-qty-inc");
    const val = page.getByTestId("pdp-qty-value");
    await expect(val).toHaveText("1");
    await expect(dec).toBeDisabled();
    for (let i = 0; i < 12; i++) if (await inc.isEnabled()) await inc.click();
    await expect(val).toHaveText("10");
    await expect(inc).toBeDisabled();
    await dec.click();
    await expect(val).toHaveText("9");
  });

  test("size required (clean): error, aria-live, focus to size group; no add", async ({ page }) => {
    const p = PRODUCTS.find((x) => x.slug === "merino-base-tee")!;
    await page.goto(`/product/${p.slug}`);
    for (const s of p.sizes!) await expect(page.getByTestId(`pdp-size-${s}`)).toHaveAttribute("aria-checked", "false");
    await page.getByTestId("add-to-cart").click();
    const err = page.getByTestId("pdp-size-error");
    await expect(err).toHaveText(/Please select a size/);
    expect((await err.getAttribute("role")) === "alert" || (await err.getAttribute("aria-live")) !== null).toBeTruthy();
    await expect(page.getByTestId(`pdp-size-${p.sizes![0]}`)).toBeFocused();
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
    expect(await readCart(page)).toBeNull();
    await page.getByTestId("pdp-size-M").click();
    await expect(err).toHaveCount(0);
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    await expect(page.getByTestId("mini-cart")).toContainText(`${p.colours[0].name} / M`);
  });

  test("silentSize product (storm-shell-jacket) behaves clean: missing size shows error", async ({ page }) => {
    await page.goto("/product/storm-shell-jacket");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("pdp-size-error")).toBeVisible();
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
  });

  test("sold out (trail-shorts) disables Add to cart with explanation", async ({ page }) => {
    await page.goto("/product/trail-shorts");
    const btn = page.getByTestId("add-to-cart");
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveText(/sold out/i);
    await expect(page.getByText("This item is currently sold out.")).toBeVisible();
  });

  test("low stock note", async ({ page }) => {
    const p = PRODUCTS.find((x) => x.stock === "low_stock")!;
    await page.goto(`/product/${p.slug}`);
    await expect(page.getByText("Only a few left")).toBeVisible();
    await expect(page.getByTestId("add-to-cart")).toBeEnabled();
  });

  test("related: 4 products, same category first, excludes current", async ({ page }) => {
    for (const slug of ["field-tote", "wool-beanie"]) {
      const p = PRODUCTS.find((x) => x.slug === slug)!;
      await page.goto(`/product/${slug}`);
      const rel = await page
        .getByTestId("related-products")
        .locator('[data-testid^="product-card-"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.replace("product-card-", "")));
      expect(rel).toHaveLength(4);
      expect(rel).not.toContain(slug);
      expect(rel).toEqual(slugs(getRelated(p, 4)));
      for (const r of rel) expect(PRODUCTS.find((x) => x.slug === r)!.category).toBe(p.category);
    }
  });
});

test.describe("cart store and drawer", () => {
  test("add to cart: merge, header count, drawer focus, Esc returns focus, persistence", async ({ page }) => {
    await page.goto("/product/field-tote");
    await expect(page.getByTestId("header-cart-count")).toBeHidden();
    await page.getByTestId("pdp-swatch-sand").click();
    await page.getByTestId("pdp-qty-inc").click();
    await page.getByTestId("add-to-cart").click();
    const drawer = page.getByTestId("mini-cart");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("role", "dialog");
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    await expect(page.getByTestId("mini-cart-close")).toBeFocused();
    await expect(drawer).toContainText("Field tote");
    await expect(drawer).toContainText("2 ×");
    await expect(page.getByTestId("header-cart-count")).toHaveText("2");
    await expect(page.getByTestId("mini-cart-view-cart")).toHaveAttribute("href", "/cart");
    await expect(page.getByTestId("mini-cart-checkout")).toHaveAttribute("href", "/checkout");

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(page.locator("#add-to-cart")).toBeFocused();

    // Same variant merges, different colour = new line.
    await page.getByTestId("add-to-cart").click(); // qty still 2
    await page.getByTestId("mini-cart-close").click();
    await expect(drawer).toHaveCount(0);
    await expect(page.locator("#add-to-cart")).toBeFocused();
    await page.getByTestId("pdp-swatch-moss").click();
    await page.getByTestId("pdp-qty-dec").click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("header-cart-count")).toHaveText("5");
    const cart = await readCart(page);
    const p = PRODUCTS.find((x) => x.slug === "field-tote")!;
    expect(cart.items).toEqual([
      expect.objectContaining({ key: `${p.id}:sand:-`, colour: "sand", quantity: 4, unitPrice: p.price, slug: p.slug }),
      expect.objectContaining({ key: `${p.id}:moss:-`, colour: "moss", quantity: 1 }),
    ]);
    await expect(page.getByTestId("mini-cart")).toContainText(/Subtotal\s*€395\.00/);

    // Persistence on reload and across pages.
    await page.reload();
    await expect(page.getByTestId("header-cart-count")).toHaveText("5");
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByTestId("header-cart-count")).toHaveText("5");
    await expect(page.getByTestId("header-cart-button")).toHaveAccessibleName("Cart, 5 items");
  });

  test("quantity merge caps at 10", async ({ page }) => {
    await page.goto("/product/key-clip");
    for (let i = 0; i < 9; i++) await page.getByTestId("pdp-qty-inc").click();
    await page.getByTestId("add-to-cart").click();
    await page.keyboard.press("Escape");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("header-cart-count")).toHaveText("10");
  });

  test("drawer traps focus with Tab / Shift+Tab", async ({ page }) => {
    await page.goto("/product/wool-beanie");
    await page.getByTestId("add-to-cart").click();
    const drawer = page.getByTestId("mini-cart");
    await expect(page.getByTestId("mini-cart-close")).toBeFocused();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.getByTestId("mini-cart-close").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByTestId("mini-cart-checkout")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("mini-cart-close")).toBeFocused();
  });

  test("drawer closes on navigation (View cart) and backdrop click", async ({ page }) => {
    await page.goto("/product/wool-beanie");
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("mini-cart-view-cart").click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/wool-beanie$/);
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    await page.mouse.click(10, 400); // backdrop (left of the panel on desktop; panel is full width on mobile)
    // On mobile the panel covers the viewport, so just ensure no crash; on desktop it must close.
  });

  test("backdrop click closes drawer (desktop)", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "panel is full-width on mobile");
    await page.goto("/product/wool-beanie");
    await page.getByTestId("add-to-cart").click();
    await page.mouse.click(10, 400);
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
  });

  test("corrupt localStorage does not crash; cart starts empty", async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, "{not json"), CART_KEY);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/category/all");
    await expect(page.getByTestId("header-cart-count")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("pre-seeded cart shows count without hydration errors", async ({ page }) => {
    const p = PRODUCTS[0];
    await page.addInitScript(
      ([k, v]) => localStorage.setItem(k, v),
      [CART_KEY, JSON.stringify({ items: [{ productId: p.id, slug: p.slug, name: p.name, colour: p.colours[0].slug, unitPrice: p.price, quantity: 3 }], promoCode: null })],
    );
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByTestId("header-cart-count")).toHaveText("3");
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
    expect(errors).toEqual([]);
  });
});
