import { CATEGORIES } from "../lib/products";
import { expect, test } from "./fixtures";

const isMobile = (name: string) => name === "mobile";

test.describe("shell: header, footer, skip link", () => {
  test("landmarks and header basics", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.getByTestId("nav-logo")).toHaveAttribute("href", "/");
    await expect(page.getByTestId("header-cart-button")).toHaveAttribute("href", "/cart");
    // Count is 0 / hidden until the cart store lands (M2).
    await expect(page.getByTestId("header-cart-count")).toBeHidden();
    await expect(page.getByTestId("header-cart-button")).toHaveAccessibleName(/cart/i);
  });

  test("desktop nav links go to the 4 PLPs", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "desktop nav only");
    await page.goto("/");
    for (const c of CATEGORIES) {
      const link = page.getByTestId(`nav-link-${c.slug}`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", `/category/${c.slug}`);
    }
    await expect(page.getByTestId("mobile-menu-button")).toBeHidden();
    await page.getByTestId("nav-link-apparel").click();
    await expect(page).toHaveURL(/\/category\/apparel$/);
    await expect(page.getByTestId("plp-title")).toHaveText("Apparel");
    await expect(page.getByTestId("nav-link-apparel")).toHaveAttribute("aria-current", "page");
    await page.getByTestId("nav-logo").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("mobile menu toggles with aria-expanded and navigates", async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), "mobile nav only");
    await page.goto("/");
    const btn = page.getByTestId("mobile-menu-button");
    await expect(btn).toBeVisible();
    await expect(page.getByTestId("nav-link-bags")).toBeHidden();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("mobile-nav-link-bags")).toBeHidden();

    const box = await btn.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    for (const c of CATEGORIES) {
      await expect(page.getByTestId(`mobile-nav-link-${c.slug}`)).toBeVisible();
      await expect(page.getByTestId(`mobile-nav-link-${c.slug}`)).toHaveAttribute("href", `/category/${c.slug}`);
    }
    // Toggle closes it again.
    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("mobile-nav-link-bags")).toBeHidden();

    // Escape closes and returns focus to the button.
    await btn.click();
    await page.keyboard.press("Escape");
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(btn).toBeFocused();

    // Navigating via a link closes the menu.
    await btn.click();
    await page.getByTestId("mobile-nav-link-accessories").click();
    await expect(page).toHaveURL(/\/category\/accessories$/);
    await expect(page.getByTestId("plp-title")).toHaveText("Accessories");
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("mobile-nav-link-bags")).toBeHidden();
  });

  test("footer has brand, shop links and copyright; info links do not 404", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByText("TIDEWILD", { exact: true })).toBeVisible();
    await expect(footer.getByText(/©\s*\d{4} Tidewild/)).toBeVisible();
    for (const c of CATEGORIES) {
      await expect(footer.locator(`a[href="/category/${c.slug}"]`)).toHaveCount(1);
    }
    // Every footer link must resolve with 200.
    const hrefs = await footer.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    for (const href of hrefs) {
      if (href.startsWith("#")) continue;
      const res = await page.request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });

  test("skip link is first focusable, visible on focus, and moves focus to main", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "keyboard flow checked on desktop");
    await page.goto("/");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    const box = await skip.boundingBox();
    expect(box!.width).toBeGreaterThan(20);
    // Focused skip link must be a readable pill (padding per tokens), >= 44px tall, not overlapping the logo text.
    expect(box!.height, "focused skip link height").toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("focus ring visible on keyboard focus of a nav link", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "desktop");
    await page.goto("/");
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // logo
    const logo = page.getByTestId("nav-logo");
    await expect(logo).toBeFocused();
    const outline = await logo.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow };
    });
    expect(outline.style !== "none" && outline.width > 0 || outline.shadow !== "none").toBeTruthy();
  });
});

test.describe("/demo-controls", () => {
  test("noindex/nofollow, no shop chrome, no CS tag request", async ({ page, csRequests }) => {
    const res = await page.goto("/demo-controls");
    expect(res?.status()).toBe(200);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    const content = (await robots.getAttribute("content")) ?? "";
    expect(content).toMatch(/noindex/);
    expect(content).toMatch(/nofollow/);
    await expect(page.getByTestId("nav-logo")).toHaveCount(0);
    await expect(page.getByTestId("header-cart-button")).toHaveCount(0);
    await expect(page.getByTestId("mobile-menu-button")).toHaveCount(0);
    await expect(page.locator("footer")).toHaveCount(0);
    await expect(page.locator("main#main")).toHaveCount(1);
    await page.waitForLoadState("networkidle");
    expect(csRequests).toHaveLength(0);
  });

  test("not linked from shop pages", async ({ page }) => {
    for (const path of ["/", "/category/all", "/cart"]) {
      await page.goto(path);
      await expect(page.locator('a[href*="demo-controls"]')).toHaveCount(0);
    }
  });

  test("shop pages are indexable (no noindex)", async ({ page }) => {
    await page.goto("/");
    const contents = await page.locator('meta[name="robots"]').evaluateAll((ms) => ms.map((m) => m.getAttribute("content") ?? ""));
    expect(contents.join(" ")).not.toMatch(/noindex/);
  });
});
