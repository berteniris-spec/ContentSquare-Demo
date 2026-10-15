import { FLAG_KEYS, FRICTION, type FlagKey } from "../lib/config";
import { applyOverrideParam } from "../lib/flags/overrides";
import { deriveProfile, resolveFlags } from "../lib/flags/resolve";
import { PRODUCTS } from "../lib/products";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

// Tester suite for M4. Complements tests/friction.spec.ts (Builder smoke checks).
// The webServer sets all NEXT_PUBLIC_FRICTION_* to off, so every ON state here comes from ?friction=.
const STORAGE_KEY = "tw-friction-overrides";
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

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

const stored = (page: Page) => page.evaluate((k) => sessionStorage.getItem(k), STORAGE_KEY);

// ---------------------------------------------------------------------------------------------
// Unit level: lib/flags/resolve.ts and the override parser (pure functions, run in node)
// ---------------------------------------------------------------------------------------------
test.describe("resolver (unit)", () => {
  test("code defaults: all ON except expressShippingError", () => {
    for (const k of FLAG_KEYS) expect(FRICTION[k]).toBe(k !== "expressShippingError");
    expect(resolveFlags({})).toEqual(FRICTION);
  });

  test("priority: override > global > env > defaults, per flag", () => {
    const defaults = FRICTION; // promoField true
    expect(resolveFlags({ env: { promoField: false } }).promoField).toBe(false);
    expect(resolveFlags({ env: { promoField: false }, global: { promoField: true } }).promoField).toBe(true);
    expect(
      resolveFlags({ env: { promoField: false }, global: { promoField: true }, override: { promoField: false } }).promoField,
    ).toBe(false);
    // a lower layer is not wiped by a higher layer that does not mention the flag
    const r = resolveFlags({
      override: { decoyBanner: false },
      global: { buriedCta: false },
      env: { deadSwatch: false },
      defaults,
    });
    expect(r).toMatchObject({ decoyBanner: false, buriedCta: false, deadSwatch: false, promoField: true, slowHero: true });
    // explicit false in a higher layer beats true in a lower one (no truthiness bug)
    expect(resolveFlags({ override: { expressShippingError: false }, global: { expressShippingError: true } }).expressShippingError).toBe(false);
    // explicit true in override beats false env
    expect(resolveFlags({ override: { expressShippingError: true }, env: { expressShippingError: false } }).expressShippingError).toBe(true);
    // does not mutate defaults
    expect(FRICTION.promoField).toBe(true);
  });

  test("deriveProfile", () => {
    const off = Object.fromEntries(FLAG_KEYS.map((k) => [k, false])) as Record<FlagKey, boolean>;
    expect(deriveProfile(FRICTION)).toBe("baseline");
    expect(deriveProfile(off)).toBe("clean");
    expect(deriveProfile({ ...off, expressShippingError: true })).toBe("express_error");
    expect(deriveProfile({ ...FRICTION, expressShippingError: true })).toBe("express_error");
    expect(deriveProfile({ ...FRICTION, postcodeValidation: false })).toBe("fixed");
    expect(deriveProfile({ ...off, promoField: true })).toBe("fixed");
  });

  test("override parser: syntax, aliases, all, reset, junk", () => {
    expect(applyOverrideParam("decoyBanner:on")).toEqual({ decoyBanner: true });
    expect(applyOverrideParam("decoyBanner:off,slowHero:on")).toEqual({ decoyBanner: false, slowHero: true });
    expect(applyOverrideParam("DECOY_BANNER:ON")).toEqual({ decoyBanner: true });
    expect(applyOverrideParam("decoy-banner:1,slowHero:false")).toEqual({ decoyBanner: true, slowHero: false });
    const allOn = applyOverrideParam("all:on");
    const allOff = applyOverrideParam("all:off");
    for (const k of FLAG_KEYS) {
      expect(allOn[k]).toBe(true);
      expect(allOff[k]).toBe(false);
    }
    // later operations win; all then single
    expect(applyOverrideParam("all:off,promoField:on")).toMatchObject({ promoField: true, slowHero: false });
    // reset clears stored base; operations after reset still apply
    expect(applyOverrideParam("reset", { promoField: true })).toEqual({});
    expect(applyOverrideParam("reset,slowHero:on", { promoField: true })).toEqual({ slowHero: true });
    // merges with stored base
    expect(applyOverrideParam("slowHero:on", { promoField: false })).toEqual({ promoField: false, slowHero: true });
    // junk ignored
    expect(applyOverrideParam("nope:on,promoField:maybe,promoField,:on,,")).toEqual({});
    expect(applyOverrideParam(null)).toEqual({});
    expect(applyOverrideParam("")).toEqual({});
  });
});

// ---------------------------------------------------------------------------------------------
// Special values and session persistence
// ---------------------------------------------------------------------------------------------
test.describe("overrides: special values and persistence", () => {
  test("all:on turns every flag on (incl. expressShippingError); all:off turns every flag off", async ({ page }) => {
    await page.goto("/category/bags?friction=all:on");
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    expect(JSON.parse((await stored(page))!)).toEqual(Object.fromEntries(FLAG_KEYS.map((k) => [k, true])));
    await page.goto("/?friction=all:on");
    await expect(page.getByTestId("hero-image")).toHaveAttribute("src", "/api/hero-image");

    await page.goto("/category/bags?friction=all:off");
    await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
    expect(JSON.parse((await stored(page))!)).toEqual(Object.fromEntries(FLAG_KEYS.map((k) => [k, false])));
  });

  test("single overrides merge with stored ones; reset clears sessionStorage; URL is not rewritten", async ({ page }) => {
    await page.goto("/category/bags?friction=decoyBanner:on");
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    await page.goto("/?friction=slowHero:on");
    await expect(page.getByTestId("hero-image")).toHaveAttribute("src", "/api/hero-image");
    expect(page.url()).toContain("friction=slowHero:on");
    expect(JSON.parse((await stored(page))!)).toEqual({ decoyBanner: true, slowHero: true });
    // second flag did not drop the first
    await page.goto("/category/bags");
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    await page.goto("/?friction=reset");
    expect(await stored(page)).toBeNull();
    await page.goto("/category/bags");
    await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
  });

  test("persists across client-side navigation (no full reload) and across reload", async ({ page }) => {
    await page.goto("/?friction=decoyBanner:on");
    await expect(page.getByTestId("hero")).toBeVisible();
    await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));
    // client-side nav via header link
    await page.locator('a[href="/category/bags"]:visible').first().click();
    await expect(page).toHaveURL(/\/category\/bags$/);
    expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
  });

  test("overrides are per browser session: a new context starts from env defaults", async ({ page, browser }) => {
    await page.goto("/category/bags?friction=decoyBanner:on");
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await other.goto(new URL("/category/bags", page.url()).toString());
    await expect(other.getByTestId("plp-title")).toBeVisible();
    await expect(other.getByTestId("plp-decoy-banner")).toHaveCount(0);
    expect(await other.evaluate((k) => sessionStorage.getItem(k), STORAGE_KEY)).toBeNull();
    await ctx.close();
  });

  test("override beats env default (env OFF in this build): each flag ON then explicit OFF returns to clean", async ({ page }) => {
    // sanity: with no override the env default (off) applies
    await page.goto("/category/bags");
    await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
    await page.goto("/category/bags?friction=decoyBanner:on");
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    await page.goto("/category/bags?friction=decoyBanner:off");
    await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
    expect(JSON.parse((await stored(page))!)).toEqual({ decoyBanner: false });
  });

  test("invalid or unknown override values are ignored and store nothing", async ({ page }) => {
    await page.goto("/category/bags?friction=bogus:on,decoyBanner:maybe");
    await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
    expect(await stored(page)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Per-flag ON / OFF behaviour (extends the Builder smoke tests)
// ---------------------------------------------------------------------------------------------
test.describe("per-flag behaviour", () => {
  test("decoyBanner: on every PLP incl. all; element is a non-focusable div with no link/handler", async ({ page }) => {
    for (const slug of ["bags", "apparel", "accessories", "all"]) {
      await page.goto(`/category/${slug}?friction=decoyBanner:on`);
      const banner = page.getByTestId("plp-decoy-banner");
      await expect(banner).toBeVisible();
      expect(await banner.evaluate((el) => ({ tag: el.tagName, tab: el.getAttribute("tabindex"), href: el.closest("a") !== null || el.querySelector("a,button") !== null }))).toEqual({ tag: "DIV", tab: null, href: false });
      const url = page.url();
      await banner.click();
      expect(page.url()).toBe(url);
      await page.goto(`/category/${slug}?friction=decoyBanner:off`);
      await expect(page.getByTestId("plp-decoy-banner")).toHaveCount(0);
    }
  });

  test("slowHero ON: hero image takes ~3 s; OFF: instant, no /api/hero-image request", async ({ page }) => {
    const hero: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/hero-image")) hero.push(r.url());
    });
    await page.goto("/?friction=slowHero:off");
    await expect(page.getByTestId("hero-image")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(hero).toHaveLength(0);
    const res = await page.request.get("/api/hero-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
    expect((await res.body()).length).toBeGreaterThan(1_000_000);

    const t0 = Date.now();
    await page.goto("/?friction=slowHero:on");
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('[data-testid="hero-image"]');
      return !!img && img.complete && img.naturalWidth > 0 && img.src.includes("/api/hero-image");
    }, null, { timeout: 15_000 });
    expect(Date.now() - t0).toBeGreaterThan(2500);
    expect(hero.length).toBeGreaterThan(0);
  });

  test("slowHero ON: hero box keeps its size (no layout shift when the image arrives)", async ({ page }) => {
    await page.goto("/?friction=slowHero:on");
    const box = page.getByTestId("hero");
    await expect(box).toBeVisible();
    const before = await box.boundingBox();
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('[data-testid="hero-image"]');
      return !!img && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 15_000 });
    const after = await box.boundingBox();
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
  });

  test("buriedCta: only the target product is affected; mobile CTA is far below the fold", async ({ page }, info) => {
    await page.goto("/product/trailhead-28-backpack?friction=buriedCta:on");
    const cta = await page.getByTestId("add-to-cart").boundingBox();
    const vh = page.viewportSize()!.height;
    if (info.project.name === "mobile") expect(cta!.y).toBeGreaterThan(vh * 2);
    else expect(cta!.y).toBeGreaterThan(vh);
    // other product: standard layout even with the flag ON
    await page.goto("/product/daypack-18?friction=buriedCta:on");
    await expect(page.getByTestId("add-to-cart")).toBeVisible();
    const ctaOther = await page.getByTestId("add-to-cart").boundingBox();
    // standard layout: CTA sits above the story and well above the buried position
    expect(ctaOther!.y).toBeLessThan(cta!.y);
    const storyCount = await page.getByTestId("pdp-story").count();
    if (storyCount > 0) {
      const story = await page.getByTestId("pdp-story").boundingBox();
      expect(ctaOther!.y).toBeLessThan(story!.y + 1);
    }
    // OFF on the target: CTA within the first screen on desktop / near it on mobile
    await page.goto("/product/trailhead-28-backpack?friction=buriedCta:off");
    const ctaOff = await page.getByTestId("add-to-cart").boundingBox();
    expect(ctaOff!.y).toBeLessThan(cta!.y);
  });

  test("buriedCta ON: Add to cart still works when scrolled to", async ({ page }) => {
    await page.goto("/product/trailhead-28-backpack?friction=buriedCta:on");
    await page.getByTestId("add-to-cart").scrollIntoViewIfNeeded();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
  });

  test("deadSwatch: only moss on field-tote is dead; OFF and other products work; no errors", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/product/field-tote?friction=deadSwatch:on");
    const moss = page.getByTestId("pdp-swatch-moss");
    const before = await moss.getAttribute("aria-checked");
    const htmlBefore = await page.getByTestId("pdp-gallery-main").innerHTML().catch(() => "");
    await moss.click();
    await page.keyboard.press("Enter");
    expect(await moss.getAttribute("aria-checked")).toBe(before);
    expect(await page.getByTestId("pdp-gallery-main").innerHTML().catch(() => "")).toBe(htmlBefore);
    // a live swatch still works
    await page.getByTestId("pdp-swatch-charcoal").click();
    await expect(page.getByTestId("pdp-swatch-charcoal")).toHaveAttribute("aria-checked", "true");
    // OFF: moss selectable
    await page.goto("/product/field-tote?friction=deadSwatch:off");
    await page.getByTestId("pdp-swatch-charcoal").click();
    await page.getByTestId("pdp-swatch-moss").click();
    await expect(page.getByTestId("pdp-swatch-moss")).toHaveAttribute("aria-checked", "true");
    // other product: all swatches work even when ON
    const other = bySlug("daypack-18");
    if (other.colours.length > 1) {
      await page.goto("/product/daypack-18?friction=deadSwatch:on");
      const last = other.colours[other.colours.length - 1].slug;
      await page.getByTestId(`pdp-swatch-${last}`).click();
      await expect(page.getByTestId(`pdp-swatch-${last}`)).toHaveAttribute("aria-checked", "true");
    }
    expect(errors).toEqual([]);
  });

  test("silentSize: silent on the target only; no event, no drawer; other sized product shows the error", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/product/storm-shell-jacket?friction=silentSize:on");
    await page.evaluate(() => ((window as unknown as { dataLayer: unknown[] }).dataLayer ??= []));
    // M6: page_view is gated on the flag provider being ready (/api/flags settled, up to 1.5 s), so wait for the
    // page-load events before taking the baseline, otherwise a late page_view is miscounted as an add_to_cart push.
    await page.waitForFunction(() => {
      const dl = (window as unknown as { dataLayer: Array<{ event?: string }> }).dataLayer;
      return dl.some((e) => e?.event === "page_view") && dl.some((e) => e?.event === "view_item");
    });
    const dlBefore = await page.evaluate(() => (window as unknown as { dataLayer: unknown[] }).dataLayer.length);
    await page.getByTestId("add-to-cart").click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId("pdp-size-error")).toHaveCount(0);
    await expect(page.getByTestId("mini-cart")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { dataLayer: unknown[] }).dataLayer.length)).toBe(dlBefore);
    expect(await page.evaluate(() => localStorage.getItem("tw-cart-v1"))).toBeNull();
    // choosing a size still works
    await page.getByTestId("pdp-size-M").click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    // another sized product keeps the clean error with the flag ON
    await page.goto("/product/grid-fleece-pullover?friction=silentSize:on");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("pdp-size-error")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("promoField: ON vs OFF layout, DEMO10 works in both", async ({ page }) => {
    await seedCart(page, "hip-pack", 2);
    await page.goto("/cart?friction=promoField:on");
    await expect(page.getByTestId("promo-code-input")).toBeVisible();
    await expect(page.getByTestId("promo-code-apply")).toBeVisible();
    await page.getByTestId("promo-code-input").fill("DEMO10");
    await page.getByTestId("promo-code-apply").click();
    await expect(page.getByTestId("promo-code-remove")).toBeVisible();
    await page.getByTestId("promo-code-remove").click();

    await page.goto("/cart?friction=promoField:off");
    await expect(page.getByTestId("promo-code-input")).toBeHidden(); // collapsed (details closed)
    await page.getByTestId("promo-code-toggle").click();
    await expect(page.getByTestId("promo-code-input")).toBeVisible();
    await page.getByTestId("promo-code-input").fill("DEMO10");
    await page.getByTestId("promo-code-apply").click();
    await expect(page.getByTestId("promo-code-remove")).toBeVisible();
    await expect(page.getByTestId("cart-discount")).toBeVisible();
  });

  test("shippingSurprise: under threshold hides shipping and the hint; over threshold shows Free; checkout always shows 6.95", async ({ page }) => {
    await seedCart(page, "hip-pack", 1); // €45
    await page.goto("/cart?friction=shippingSurprise:on");
    await expect(page.getByTestId("cart-shipping")).toHaveText("Calculated at checkout");
    await expect(page.getByTestId("cart-total")).toHaveText("€45.00");
    await expect(page.getByTestId("cart-free-shipping-hint")).toHaveCount(0);
    await page.goto("/checkout?friction=shippingSurprise:on");
    await expect(page.getByTestId("checkout-summary-shipping")).toHaveText("€6.95");
    await expect(page.getByTestId("checkout-summary-total")).toHaveText("€51.95");

    await page.goto("/cart?friction=shippingSurprise:off");
    await expect(page.getByTestId("cart-shipping")).toHaveText("€6.95");
    await expect(page.getByTestId("cart-total")).toHaveText("€51.95");
    await expect(page.getByTestId("cart-free-shipping-hint")).toBeVisible();

    await seedCart(page, "hip-pack", 2); // €90
    for (const v of ["on", "off"]) {
      await page.goto(`/cart?friction=shippingSurprise:${v}`);
      await expect(page.getByTestId("cart-shipping")).toHaveText("Free");
      await expect(page.getByTestId("cart-total")).toHaveText("€90.00");
    }
  });

  test("postcodeValidation ON: strict rules, generic message; OFF: per-country normalising with helpful message", async ({ page }) => {
    await seedCart(page, "hip-pack");
    await page.goto("/checkout?friction=postcodeValidation:on");
    const pc = page.getByTestId("checkout-postcode");
    for (const bad of ["1234 AB", "1234ab", "1234 ab", "12", "AB1234", "123456"]) {
      await pc.fill(bad);
      await pc.blur();
      await expect(page.getByTestId("error-postcode"), `strict rejects ${bad}`).toHaveText("Invalid input.");
    }
    for (const good of ["1234AB", "1234", "12345"]) {
      await pc.fill(good);
      await pc.blur();
      await expect(page.getByTestId("error-postcode"), `strict accepts ${good}`).toHaveCount(0);
    }
    await page.goto("/checkout?friction=postcodeValidation:off");
    await pc.fill("12");
    await pc.blur();
    const msg = page.getByTestId("error-postcode");
    await expect(msg).toBeVisible();
    await expect(msg).not.toHaveText("Invalid input.");
    for (const good of ["1234 AB", "1234ab", "1234AB"]) {
      await pc.fill(good);
      await pc.blur();
      await expect(page.getByTestId("error-postcode"), `clean accepts ${good}`).toHaveCount(0);
    }
  });

  test("expressShippingError ON: only /^10/ postcodes; Pay does nothing and throws; Standard recovers; other postcodes fine", async ({ page }) => {
    const errors = collectErrors(page);
    await seedCart(page, "hip-pack");
    await page.goto("/checkout?friction=expressShippingError:on");
    const pc = page.getByTestId("checkout-postcode");
    // Non-matching postcode with Express: no error, rate applies
    await pc.fill("2012 AB");
    await page.getByTestId("shipping-express").check();
    await expect(page.getByTestId("checkout-summary-shipping")).toHaveText("€12.95");
    expect(errors).toEqual([]);
    // Change postcode to a matching one while Express is selected: throws
    await pc.fill("1012 AB");
    await pc.blur();
    await expect.poll(() => errors.filter((e) => e.startsWith("pageerror")).length).toBeGreaterThan(0);
    expect(errors.find((e) => e.startsWith("pageerror"))).toMatch(/TypeError|rate|undefined/);
    // page did not crash
    await expect(page.getByTestId("checkout-submit")).toBeVisible();
    await expect(page.getByTestId("checkout-submit")).toBeEnabled();
    // Pay does nothing (no navigation, no processing)
    await page.getByTestId("checkout-submit").click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId("checkout-processing")).toHaveCount(0);
    // Standard clears it
    await page.getByTestId("shipping-standard").check();
    await expect(page.getByTestId("checkout-summary-shipping")).toHaveText("€6.95");
    errors.length = 0;
    await page.getByTestId("checkout-submit").click(); // validation errors expected, but no thrown TypeError
    await page.waitForTimeout(300);
    expect(errors.filter((e) => e.startsWith("pageerror"))).toEqual([]);
  });

  test("expressShippingError OFF: Express works for a /^10/ postcode with a clean console", async ({ page }) => {
    const errors = collectErrors(page);
    await seedCart(page, "hip-pack");
    await page.goto("/checkout?friction=expressShippingError:off");
    for (const code of ["1012 AB", "1000", "10115"]) {
      await page.getByTestId("checkout-postcode").fill(code);
      await page.getByTestId("shipping-express").check();
      await expect(page.getByTestId("checkout-summary-shipping")).toHaveText("€12.95");
    }
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// Console errors: only from expressShippingError ON
// ---------------------------------------------------------------------------------------------
test.describe("console cleanliness", () => {
  const sweep = async (page: Page, query: string) => {
    const errors = collectErrors(page);
    await seedCart(page, "hip-pack", 2);
    const routes = [
      `/?${query}`, `/category/all?${query}`, `/category/bags?${query}`, `/product/trailhead-28-backpack?${query}`,
      `/product/field-tote?${query}`, `/product/storm-shell-jacket?${query}`, `/cart?${query}`, `/checkout?${query}`,
    ];
    for (const r of routes) {
      await page.goto(r);
      await page.waitForLoadState("networkidle");
    }
    // complete a checkout path touching postcode + Standard
    await page.getByTestId("checkout-postcode").fill("1012 AB");
    await page.getByTestId("checkout-postcode").blur();
    await page.getByTestId("shipping-standard").check();
    return errors;
  };

  test("all flags OFF: zero console errors / page errors across the shop", async ({ page }) => {
    expect(await sweep(page, "friction=all:off")).toEqual([]);
  });

  test("all flags ON except expressShippingError: zero console errors / page errors", async ({ page }) => {
    expect(await sweep(page, "friction=all:on,expressShippingError:off")).toEqual([]);
  });

  test("expressShippingError ON is the only source of errors (all:off + that flag)", async ({ page }) => {
    const errors = await sweep(page, "friction=all:off,expressShippingError:on");
    expect(errors).toEqual([]); // Standard selected: nothing thrown yet
    await page.getByTestId("shipping-express").check();
    await expect.poll(() => errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => e.startsWith("pageerror"))).toBe(true);
  });

  test("OFF fully removes the trace: after ON then OFF, no banner, hero via static asset, Express clean", async ({ page }) => {
    await page.goto("/category/bags?friction=all:on");
    await expect(page.getByTestId("plp-decoy-banner")).toBeVisible();
    const hero: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/hero-image")) hero.push(r.url());
    });
    await page.goto("/?friction=all:off");
    await expect(page.getByTestId("hero-image")).toHaveAttribute("src", "/images/hero.svg");
    await page.waitForLoadState("networkidle");
    expect(hero).toHaveLength(0);
  });
});
