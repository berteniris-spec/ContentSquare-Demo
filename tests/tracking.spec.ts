import { expect, test } from "./fixtures";
import {
  CS_URL,
  GA_ID,
  bySlug,
  gtagEntries,
  gtagEvents,
  payAndConfirm,
  plainEvents,
  readDL,
  seedCartInit,
  uxa,
  waitCsLoaded,
  waitPageView,
} from "./tracking-helpers";
import type { Page } from "@playwright/test";

const FLAG_VARS = [
  ["promoField", "friction_promo_field"],
  ["shippingSurprise", "friction_shipping_surprise"],
  ["decoyBanner", "friction_decoy_banner"],
  ["buriedCta", "friction_buried_cta"],
  ["deadSwatch", "friction_dead_swatch"],
  ["silentSize", "friction_silent_size"],
  ["slowHero", "friction_slow_hero"],
  ["postcodeValidation", "friction_postcode_validation"],
  ["expressShippingError", "friction_express_error"],
] as const;

const GA_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
const tee = bySlug("merino-base-tee");

/** Header category link on desktop; hamburger menu link on mobile. */
async function goNav(page: Page, slug: string) {
  const burger = page.getByTestId("mobile-menu-button");
  if (await burger.isVisible()) {
    await burger.click();
    await page.getByTestId(`mobile-nav-link-${slug}`).click();
  } else {
    await page.getByTestId(`nav-link-${slug}`).click();
  }
}

function dynVars(u: unknown[][]) {
  return u.filter((c) => c[0] === "trackDynamicVariable").map((c) => c[1] as { key: string; value: unknown });
}

/** Add the tee (size M) to the cart through the UI and go to /cart then /checkout by client-side navigation. */
async function addTeeViaUi(page: Page) {
  await page.goto(`/product/${tee.slug}`);
  await page.getByTestId("pdp-size-M").click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("mini-cart")).toBeVisible();
}

test.describe("Contentsquare tag", () => {
  test("script requested exactly once on a shop page and again-free across client navigation", async ({ page, csRequests }) => {
    await page.goto("/");
    await waitCsLoaded(page);
    expect(csRequests.map((r) => r.url())).toEqual([CS_URL]);
    await expect(page.locator("script#cs-src, script[src*='t.contentsquare.net']")).toHaveCount(1);
    await page.getByTestId("hero-cta").click();
    await expect(page).toHaveURL(/\/category\/all/);
    await page.getByTestId("product-card-merino-base-tee").click();
    await expect(page.getByTestId("pdp-name")).toBeVisible();
    await waitPageView(page, 3);
    expect(csRequests).toHaveLength(1);
    await expect(page.locator("script[src*='t.contentsquare.net']")).toHaveCount(1);
  });

  test("requested once on every shop route (full loads) incl. 404", async ({ page, csRequests }) => {
    for (const path of ["/", "/category/bags", "/product/field-tote", "/cart", "/checkout", "/confirmation", "/nope-404", "/product/not-a-product"]) {
      csRequests.length = 0;
      await page.goto(path);
      await waitCsLoaded(page);
      expect(csRequests.map((r) => r.url()), path).toEqual([CS_URL]);
      await expect(page.locator("script[src*='t.contentsquare.net']"), path).toHaveCount(1);
    }
  });

  test("not loaded on /demo-controls (direct load)", async ({ page, csRequests }) => {
    await page.goto("/demo-controls");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(csRequests).toHaveLength(0);
    await expect(page.locator("script[src*='t.contentsquare.net'], script#cs-src, script#cs-init")).toHaveCount(0);
    const st = await page.evaluate(() => ({
      uxa: (window as unknown as { _uxa?: unknown })._uxa,
      loaded: (window as unknown as { __csLoaded?: unknown }).__csLoaded,
    }));
    expect(st.uxa).toBeUndefined();
    expect(st.loaded).toBeUndefined();
  });

  test("initial load sends no manual trackPageview; route changes push pathname + search after the tag loaded", async ({ page }) => {
    await page.goto("/");
    await waitCsLoaded(page);
    await waitPageView(page, 1);
    expect((await uxa(page)).filter((c) => c[0] === "trackPageview")).toEqual([]);

    await page.getByTestId("hero-cta").click();
    await expect(page).toHaveURL(/\/category\/all$/);
    await page.getByTestId("plp-sort").selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    await page.getByTestId("product-card-merino-base-tee").click();
    await expect(page.getByTestId("pdp-name")).toBeVisible();
    await waitPageView(page, 4);

    const pv = (await uxa(page)).filter((c) => c[0] === "trackPageview");
    expect(pv).toEqual([
      ["trackPageview", "/category/all"],
      ["trackPageview", "/category/all?sort=price-asc"],
      ["trackPageview", "/product/merino-base-tee"],
    ]);
    // dataLayer page_view mirrors the same paths (initial + 3 route changes).
    const paths = (await plainEvents(page, "page_view")).map((e) => e.page_path);
    expect(paths).toEqual(["/", "/category/all", "/category/all?sort=price-asc", "/product/merino-base-tee"]);
  });

  test("trackPageview comes before the dynamic variables of the same page view", async ({ page }) => {
    await page.goto("/");
    await waitCsLoaded(page);
    await waitPageView(page, 1);
    await page.getByTestId("hero-cta").click();
    await waitPageView(page, 2);
    const u = await uxa(page);
    const i = u.findIndex((c) => c[0] === "trackPageview");
    expect(i).toBeGreaterThan(0);
    // Everything after the trackPageview up to the end is the second batch: 10 dynamic variables.
    expect(u.slice(i + 1).every((c) => c[0] === "trackDynamicVariable")).toBe(true);
    expect(u.slice(i + 1)).toHaveLength(10);
  });

  test("no trackPageview while the tag has not loaded (delayed script); no data loss afterwards", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    // Registered after the fixture, so it wins.
    await page.route(/https?:\/\/t\.contentsquare\.net\/.*/, async (route) => {
      await gate;
      await route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__csStub = true;" });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitPageView(page, 1);
    await page.getByTestId("hero-cta").click();
    await expect(page).toHaveURL(/\/category\/all$/);
    await waitPageView(page, 2);
    expect(await page.evaluate(() => (window as unknown as { __csLoaded?: boolean }).__csLoaded)).toBeFalsy();
    expect((await uxa(page)).filter((c) => c[0] === "trackPageview")).toEqual([]);
    // Dynamic variables are still queued (replayed by the tag once loaded): 10 per page view.
    expect(dynVars(await uxa(page))).toHaveLength(20);
    release();
    await waitCsLoaded(page);
    await goNav(page, "bags");
    await expect(page).toHaveURL(/\/category\/bags$/);
    await waitPageView(page, 3);
    expect((await uxa(page)).filter((c) => c[0] === "trackPageview")).toEqual([["trackPageview", "/category/bags"]]);
  });

  test("a route change to the same location does not repeat the page view", async ({ page }) => {
    await page.goto("/category/bags");
    await waitPageView(page, 1);
    await goNav(page, "bags");
    await page.waitForTimeout(500);
    expect(await plainEvents(page, "page_view")).toHaveLength(1);
    expect(dynVars(await uxa(page))).toHaveLength(10);
  });
});

test.describe("Contentsquare dynamic variables", () => {
  const STATES: { name: string; qs: string; expected: Record<string, "on" | "off">; profile: string }[] = [
    { name: "build default (all OFF)", qs: "", expected: {}, profile: "clean" },
    {
      name: "all:on",
      qs: "?friction=all:on",
      expected: Object.fromEntries(FLAG_VARS.map(([k]) => [k, "on"])),
      profile: "express_error",
    },
    {
      name: "baseline (all ON except expressShippingError)",
      qs: "?friction=all:on,expressShippingError:off",
      expected: Object.fromEntries(FLAG_VARS.filter(([k]) => k !== "expressShippingError").map(([k]) => [k, "on"])),
      profile: "baseline",
    },
    {
      name: "fixed (only fix errors)",
      qs: "?friction=all:on,expressShippingError:off,postcodeValidation:off",
      expected: Object.fromEntries(FLAG_VARS.filter(([k]) => k !== "expressShippingError" && k !== "postcodeValidation").map(([k]) => [k, "on"])),
      profile: "fixed",
    },
    { name: "single flag decoyBanner", qs: "?friction=decoyBanner:on", expected: { decoyBanner: "on" }, profile: "fixed" },
    { name: "express error only", qs: "?friction=expressShippingError:on", expected: { expressShippingError: "on" }, profile: "express_error" },
  ];

  for (const s of STATES) {
    test(`10 friction_* variables with correct values: ${s.name}`, async ({ page }) => {
      await page.goto(`/${s.qs}`);
      await waitPageView(page, 1);
      const vars = dynVars(await uxa(page));
      expect(vars).toHaveLength(10);
      const byKey = Object.fromEntries(vars.map((v) => [v.key, v.value]));
      for (const [flag, key] of FLAG_VARS) {
        expect(byKey[key], key).toBe(s.expected[flag] ?? "off");
      }
      expect(byKey["friction_profile"]).toBe(s.profile);
      expect(Object.keys(byKey).sort()).toEqual([...FLAG_VARS.map(([, k]) => k), "friction_profile"].sort());
      // Same state in the dataLayer page_view.
      const pv = (await plainEvents(page, "page_view"))[0] as Record<string, unknown>;
      const fr = pv.friction as Record<string, string>;
      for (const [flag] of FLAG_VARS) expect(fr[flag], flag).toBe(s.expected[flag] ?? "off");
      expect(pv.friction_profile).toBe(s.profile);
    });
  }

  test("variables are pushed again with the new state when an override changes between page views", async ({ page }) => {
    await page.goto("/?friction=decoyBanner:on");
    await waitPageView(page, 1);
    await goNav(page, "all");
    await waitPageView(page, 2);
    // Second page view: still ON (override persists in sessionStorage).
    const vars = dynVars(await uxa(page));
    expect(vars).toHaveLength(20);
    expect(vars.slice(10).find((v) => v.key === "friction_decoy_banner")?.value).toBe("on");
  });

  test("order_value is pushed once, on the confirmation page only, as a 2 dp number", async ({ page }) => {
    await seedCartInit(page, [{ slug: tee.slug, size: "M", qty: 1 }]);
    await page.goto("/cart");
    await page.getByTestId("proceed-to-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await waitPageView(page, 2);
    expect(dynVars(await uxa(page)).filter((v) => v.key === "order_value")).toHaveLength(0);
    await payAndConfirm(page);
    await waitPageView(page, 3);
    await expect.poll(async () => dynVars(await uxa(page)).filter((v) => v.key === "order_value").length).toBe(1);
    const ov = dynVars(await uxa(page)).find((v) => v.key === "order_value")!;
    const total = Number((await page.getByTestId("confirmation-total").innerText()).replace(/[^0-9.]/g, ""));
    expect(typeof ov.value).toBe("number");
    expect(ov.value).toBe(total);
    // Wait: no second one appears.
    await page.waitForTimeout(800);
    expect(dynVars(await uxa(page)).filter((v) => v.key === "order_value")).toHaveLength(1);
  });
});

test.describe("dataLayer events", () => {
  test("page_view payload on first load", async ({ page }) => {
    await page.goto("/category/bags?sort=price-desc");
    await waitPageView(page, 1);
    const pv = (await plainEvents(page, "page_view"))[0];
    expect(pv.page_type).toBe("plp");
    expect(pv.page_path).toBe("/category/bags?sort=price-desc");
    expect(Object.keys(pv.friction as object).sort()).toEqual(FLAG_VARS.map(([k]) => k).sort());
    expect(Object.values(pv.friction as object).every((v) => v === "on" || v === "off")).toBe(true);
    expect(["baseline", "express_error", "fixed", "clean"]).toContain(pv.friction_profile);
    expect(Object.keys(pv).sort()).toEqual(["event", "friction", "friction_profile", "page_path", "page_type"]);
  });

  test("page_view per route change with the right page_type", async ({ page }) => {
    await page.goto("/");
    await waitPageView(page, 1);
    await goNav(page, "bags");
    await waitPageView(page, 2);
    await page.getByTestId("product-card-field-tote").click();
    await waitPageView(page, 3);
    const pv = await plainEvents(page, "page_view");
    expect(pv.map((p) => p.page_type)).toEqual(["home", "plp", "pdp"]);
    expect(pv.map((p) => p.page_path)).toEqual(["/", "/category/bags", "/product/field-tote"]);
  });

  test("view_item payload on PDP mount (once)", async ({ page }) => {
    await page.goto(`/product/${tee.slug}`);
    await waitPageView(page, 1);
    const ev = await plainEvents(page, "view_item");
    expect(ev).toHaveLength(1);
    expect(ev[0].ecommerce).toEqual({
      currency: "EUR",
      value: tee.price,
      items: [{ item_id: tee.id, item_name: tee.name, item_category: tee.category, price: tee.price, quantity: 1 }],
    });
  });

  test("add_to_cart payload (variant, quantity, value); none on missing size", async ({ page }) => {
    await page.goto(`/product/${tee.slug}`);
    await waitPageView(page, 1);
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("pdp-size-error")).toBeVisible();
    expect(await plainEvents(page, "add_to_cart")).toHaveLength(0);
    await page.getByTestId("pdp-size-M").click();
    await page.getByTestId("pdp-qty-inc").click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    const ev = await plainEvents(page, "add_to_cart");
    expect(ev).toHaveLength(1);
    expect(ev[0].ecommerce).toEqual({
      currency: "EUR",
      value: tee.price * 2,
      items: [
        {
          item_id: tee.id,
          item_name: tee.name,
          item_category: tee.category,
          item_variant: `${tee.colours[0].slug} / M`,
          price: tee.price,
          quantity: 2,
        },
      ],
    });
  });

  test("add_to_cart for an unsized product has a colour-only variant", async ({ page }) => {
    const hat = bySlug("wool-beanie");
    await page.goto(`/product/${hat.slug}`);
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    const ev = (await plainEvents(page, "add_to_cart"))[0];
    const item = (ev.ecommerce as { items: Record<string, unknown>[] }).items[0];
    expect(item.item_variant).toBe(hat.colours[0].slug);
    expect(item.quantity).toBe(1);
  });

  test("silentSize ON: blocked add pushes no add_to_cart (dataLayer and gtag)", async ({ page }) => {
    await page.goto("/product/storm-shell-jacket?friction=silentSize:on");
    await waitPageView(page, 1);
    await page.getByTestId("add-to-cart").click();
    await page.waitForTimeout(500);
    expect(await plainEvents(page, "add_to_cart")).toHaveLength(0);
    expect(await gtagEvents(page, "add_to_cart")).toHaveLength(0);
  });

  test("remove_from_cart only on Remove (steppers do not fire it), payload quantity = line quantity", async ({ page }) => {
    await seedCartInit(page, [{ slug: tee.slug, size: "M", qty: 2 }]);
    await page.goto("/cart");
    await waitPageView(page, 1);
    const line = page.getByTestId("cart-line-" + `${tee.id}:${tee.colours[0].slug}:M`);
    await line.getByTestId("cart-qty-inc").click();
    await line.getByTestId("cart-qty-dec").click();
    await line.getByTestId("cart-qty-dec").click();
    expect(await plainEvents(page, "remove_from_cart")).toHaveLength(0);
    await expect(line.getByTestId("cart-qty-value")).toHaveText("1");
    await line.getByTestId("cart-remove").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    const ev = await plainEvents(page, "remove_from_cart");
    expect(ev).toHaveLength(1);
    expect(ev[0].ecommerce).toEqual({
      currency: "EUR",
      value: tee.price,
      items: [
        {
          item_id: tee.id,
          item_name: tee.name,
          item_category: tee.category,
          item_variant: `${tee.colours[0].slug} / M`,
          price: tee.price,
          quantity: 1,
        },
      ],
    });
  });

  test("begin_checkout payload (before page_view on /checkout), once, with coupon", async ({ page }) => {
    await seedCartInit(page, [{ slug: tee.slug, size: "M", qty: 2 }], "DEMO10");
    await page.goto("/checkout");
    await waitPageView(page, 1);
    await expect.poll(async () => (await plainEvents(page, "begin_checkout")).length).toBe(1);
    const dl = await readDL(page);
    const names = dl.flatMap((d) => (d.kind === "plain" ? [d.entry.event] : []));
    expect(names.indexOf("begin_checkout")).toBeLessThan(names.indexOf("page_view"));
    const bc = (await plainEvents(page, "begin_checkout"))[0];
    const subtotal = tee.price * 2;
    const afterDiscount = Math.round((subtotal - Math.round(subtotal * 0.1 * 100) / 100) * 100) / 100;
    expect(bc.ecommerce).toEqual({
      currency: "EUR",
      value: afterDiscount,
      coupon: "DEMO10",
      items: [
        {
          item_id: tee.id,
          item_name: tee.name,
          item_category: tee.category,
          item_variant: `${tee.colours[0].slug} / M`,
          price: tee.price,
          quantity: 2,
        },
      ],
    });
    // Selecting Express / typing does not repeat it.
    await page.getByTestId("shipping-express").click();
    await page.getByTestId("checkout-city").fill("Utrecht");
    expect(await plainEvents(page, "begin_checkout")).toHaveLength(1);
  });

  test("begin_checkout is not pushed for an empty cart; no coupon key without promo", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-empty")).toBeVisible();
    await page.waitForTimeout(500);
    expect(await plainEvents(page, "begin_checkout")).toHaveLength(0);
  });

  test("full journey: purchase payload, once, no PII, order_value matches", async ({ page }) => {
    await addTeeViaUi(page);
    await page.getByTestId("mini-cart-view-cart").click();
    await expect(page).toHaveURL(/\/cart$/);
    await page.getByTestId("promo-code-toggle").click().catch(() => undefined);
    await page.getByTestId("promo-code-input").fill("DEMO10");
    await page.getByTestId("promo-code-apply").click();
    await expect(page.getByTestId("cart-discount")).toBeVisible();
    await page.getByTestId("proceed-to-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await payAndConfirm(page);
    await expect.poll(async () => (await plainEvents(page, "purchase")).length).toBe(1);

    const sub = tee.price;
    const discount = Math.round(sub * 0.1 * 100) / 100;
    const afterDisc = sub - discount;
    const shipping = afterDisc >= 75 ? 0 : 6.95;
    const total = Math.round((afterDisc + shipping) * 100) / 100;
    const orderNo = (await page.getByTestId("confirmation-order-number").innerText()).match(/TW-\d{6}/)![0];
    const p = (await plainEvents(page, "purchase"))[0].ecommerce as Record<string, unknown>;
    expect(p.transaction_id).toBe(orderNo);
    expect(p).toEqual({
      transaction_id: orderNo,
      value: total,
      currency: "EUR",
      shipping,
      discount,
      coupon: "DEMO10",
      items: [
        {
          item_id: tee.id,
          item_name: tee.name,
          item_category: tee.category,
          item_variant: `${tee.colours[0].slug} / M`,
          price: tee.price,
          quantity: 1,
        },
      ],
    });
    // Sequence sanity within one SPA session: add_to_cart, begin_checkout, purchase all present once.
    for (const n of ["view_item", "add_to_cart", "begin_checkout", "purchase"]) {
      expect((await plainEvents(page, n)).length, n).toBe(1);
    }
    // No PII or card data anywhere in the data layer or the _uxa queue.
    const blob = JSON.stringify(await readDL(page)) + JSON.stringify(await uxa(page));
    expect(blob).not.toContain("hiker.private");
    expect(blob).not.toContain("@example.com");
    expect(blob).not.toContain("4242");
    expect(blob).not.toContain("Trail");
    expect(blob).not.toContain("Kade");
    expect(blob).not.toContain("1234 AB");
  });

  test("purchase without promo has no coupon key, and is not repeated on reload, history back or revisit", async ({ page }) => {
    await seedCartInit(page, [{ slug: "wool-beanie", qty: 1 }]);
    await page.goto("/cart");
    await page.getByTestId("proceed-to-checkout").click();
    await payAndConfirm(page);
    await expect.poll(async () => (await plainEvents(page, "purchase")).length).toBe(1);
    const p = (await plainEvents(page, "purchase"))[0].ecommerce as Record<string, unknown>;
    expect("coupon" in p).toBe(false);

    // Client-side: leave and come back with history. Still one.
    await page.getByTestId("continue-shopping").click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goBack();
    await expect(page.getByTestId("confirmation-order-number")).toBeVisible();
    await page.waitForTimeout(500);
    expect(await plainEvents(page, "purchase")).toHaveLength(1);

    // Reload and direct revisit (new document, new data layer): never re-fires for the same order.
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await expect(page.getByTestId("confirmation-order-number")).toBeVisible();
      await waitPageView(page, 1);
      await page.waitForTimeout(500);
      expect(await plainEvents(page, "purchase"), `after reload ${i + 1}`).toHaveLength(0);
      expect((await uxa(page)).filter((c) => c[0] === "trackDynamicVariable" && (c[1] as { key: string }).key === "order_value")).toHaveLength(0);
      expect(await gtagEvents(page, "purchase")).toHaveLength(0);
    }
    await page.goto("/confirmation");
    await waitPageView(page, 1);
    await page.waitForTimeout(500);
    expect(await plainEvents(page, "purchase")).toHaveLength(0);
  });

  test("confirmation with no order pushes no purchase", async ({ page }) => {
    await page.goto("/confirmation");
    await expect(page.getByTestId("confirmation-no-order")).toBeVisible();
    await waitPageView(page, 1);
    expect(await plainEvents(page, "purchase")).toHaveLength(0);
    expect((await plainEvents(page, "page_view"))[0].page_type).toBe("confirmation");
  });

  test("two separate orders each fire purchase once", async ({ page }) => {
    await seedCartInit(page, [{ slug: "wool-beanie", qty: 1 }]);
    await page.goto("/cart");
    await page.getByTestId("proceed-to-checkout").click();
    await payAndConfirm(page);
    const first = (await page.getByTestId("confirmation-order-number").innerText()).match(/TW-\d{6}/)![0];
    await expect.poll(async () => (await plainEvents(page, "purchase")).length).toBe(1);
    // Second order in the same SPA session.
    await goNav(page, "accessories");
    await page.getByTestId("product-card-wool-beanie").click();
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("mini-cart-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await payAndConfirm(page);
    await expect.poll(async () => (await plainEvents(page, "purchase")).length).toBe(2);
    const ids = (await plainEvents(page, "purchase")).map((e) => (e.ecommerce as { transaction_id: string }).transaction_id);
    expect(ids[0]).toBe(first);
    expect(new Set(ids).size).toBe(2);
  });
});

test.describe("data-page-type", () => {
  const CASES: [string, string][] = [
    ["/", "home"],
    ["/category/all", "plp"],
    ["/category/bags", "plp"],
    ["/category/apparel", "plp"],
    ["/category/accessories", "plp"],
    ["/product/field-tote", "pdp"],
    ["/cart", "cart"],
    ["/checkout", "checkout"],
    ["/confirmation", "confirmation"],
    ["/demo-controls", "demo-controls"],
    ["/nope-404", "not-found"],
    ["/product/not-a-product", "not-found"],
    ["/category/shoes", "not-found"],
  ];
  for (const [path, type] of CASES) {
    test(`${path} -> ${type}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("body")).toHaveAttribute("data-page-type", type);
    });
  }

  test("updates on client-side navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "home");
    await goNav(page, "bags");
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "plp");
    await page.getByTestId("product-card-field-tote").click();
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "pdp");
    await page.goBack();
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "plp");
    await page.getByTestId("nav-logo").click();
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "home");
  });
});

test.describe("404 page tracking", () => {
  test("has both tags and data-page-type but no page_view (RouteTracker is in the shop layout)", async ({ page, csRequests, gaRequests }) => {
    const res = await page.goto("/product/not-a-product");
    expect(res?.status()).toBe(404);
    await waitCsLoaded(page);
    expect(csRequests).toHaveLength(1);
    expect(gaRequests.map((r) => r.url())).toEqual([GA_URL]);
    await expect(page.locator("script#ga-src")).toHaveCount(1);
    await expect(page.locator("body")).toHaveAttribute("data-page-type", "not-found");
    await page.waitForTimeout(500);
    expect(await plainEvents(page, "page_view")).toHaveLength(0);
  });
});

test.describe("selectors (PLAN section 8)", () => {
  const present = async (page: Page, ids: string[], where: string) => {
    for (const id of ids) {
      await expect(page.getByTestId(id).first(), `${where}: ${id}`).toBeAttached();
    }
  };

  test("header and footer, home", async ({ page }, info) => {
    await page.goto("/");
    await present(page, ["nav-logo", "header-cart-button"], "header");
    if (info.project.name === "desktop") {
      await present(page, ["nav-link-bags", "nav-link-apparel", "nav-link-accessories", "nav-link-all"], "header desktop");
    } else {
      await page.getByTestId("mobile-menu-button").click();
      await present(page, ["mobile-nav-link-bags", "mobile-nav-link-apparel", "mobile-nav-link-accessories", "mobile-nav-link-all"], "mobile nav");
    }
    await present(
      page,
      [
        "hero", "hero-cta", "hero-image",
        "category-tile-bags", "category-tile-apparel", "category-tile-accessories",
        "featured-row", "values-strip", "newsletter-email", "newsletter-submit",
      ],
      "home",
    );
    await page.getByTestId("newsletter-email").fill("a@b.co");
    await page.getByTestId("newsletter-submit").click();
    await present(page, ["newsletter-thanks"], "home after submit");
    // header-cart-count appears once the cart has items.
    await seedCartInit(page, [{ slug: "wool-beanie" }]);
    await page.goto("/");
    await present(page, ["header-cart-count"], "header with items");
  });

  test("PLP", async ({ page }) => {
    await page.goto("/category/bags?friction=decoyBanner:on");
    await present(page, ["plp-title", "plp-count", "plp-sort", "plp-grid", "plp-decoy-banner"], "plp");
    await expect(page.locator('[data-testid^="product-card-"]').first()).toBeAttached();
  });

  test("PDP (sized product) and mini-cart", async ({ page }) => {
    await page.goto(`/product/${tee.slug}`);
    await present(
      page,
      [
        "pdp-gallery-main", "pdp-thumb-0", "pdp-name", "pdp-price",
        `pdp-swatch-${tee.colours[0].slug}`, "pdp-size-M", "pdp-qty-dec", "pdp-qty-value", "pdp-qty-inc",
        "add-to-cart", "related-products",
      ],
      "pdp",
    );
    await expect(page.locator("#add-to-cart")).toHaveCount(1);
    await page.getByTestId("add-to-cart").click();
    await present(page, ["pdp-size-error"], "pdp error");
    await page.getByTestId("pdp-size-M").click();
    await page.getByTestId("add-to-cart").click();
    await present(page, ["mini-cart", "mini-cart-close", "mini-cart-view-cart", "mini-cart-checkout"], "mini cart");
  });

  test("PDP story block with buriedCta ON", async ({ page }) => {
    await page.goto("/product/trailhead-28-backpack?friction=buriedCta:on");
    await present(page, ["pdp-story", "add-to-cart"], "buried pdp");
  });

  test("cart", async ({ page }) => {
    await seedCartInit(page, [{ slug: tee.slug, size: "M", qty: 1 }]);
    await page.goto("/cart");
    const key = `${tee.id}:${tee.colours[0].slug}:M`;
    await present(
      page,
      [`cart-line-${key}`, "cart-qty-dec", "cart-qty-inc", "cart-qty-value", "cart-remove", "cart-line-total", "cart-subtotal", "cart-shipping", "cart-total", "promo-code-toggle", "proceed-to-checkout"],
      "cart",
    );
    await page.getByTestId("promo-code-toggle").click();
    await present(page, ["promo-code-input", "promo-code-apply"], "cart promo");
    await expect(page.locator("#promo-code")).toHaveCount(1);
    await page.getByTestId("promo-code-input").fill("NOPE");
    await page.getByTestId("promo-code-apply").click();
    await present(page, ["promo-code-message"], "cart promo message");
    await page.getByTestId("promo-code-input").fill("DEMO10");
    await page.getByTestId("promo-code-apply").click();
    await present(page, ["cart-discount"], "cart discount");
    await page.getByTestId("cart-remove").click();
    await present(page, ["cart-empty"], "cart empty");
  });

  test("checkout and confirmation", async ({ page }) => {
    await seedCartInit(page, [{ slug: tee.slug, size: "M", qty: 1 }]);
    await page.goto("/checkout");
    const fields = ["email", "firstName", "lastName", "address", "city", "postcode", "country", "cardNumber", "cardExpiry", "cardCvc"];
    await present(
      page,
      ["checkout-demo-banner", ...fields.map((f) => `checkout-${f}`), "shipping-standard", "shipping-express", "checkout-summary-shipping", "checkout-summary-total", "checkout-submit"],
      "checkout",
    );
    await expect(page.locator("#checkout-submit")).toHaveCount(1);
    await page.getByTestId("checkout-submit").click();
    await present(page, fields.filter((f) => f !== "country").map((f) => `error-${f}`), "checkout errors");
    await payAndConfirm(page);
    await present(page, ["confirmation-order-number", "confirmation-summary", "confirmation-total", "continue-shopping"], "confirmation");
  });

  test("checkout-processing is visible while processing", async ({ page }) => {
    await seedCartInit(page, [{ slug: "wool-beanie" }]);
    await page.goto("/checkout");
    const { fillCheckout } = await import("./tracking-helpers");
    await fillCheckout(page);
    await page.getByTestId("checkout-submit").click();
    await present(page, ["checkout-processing"], "processing");
  });

  test("footer is present on shop pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });
});

test.describe("Google Analytics", () => {
  const ROUTES = ["/", "/category/all", "/category/bags", "/product/field-tote", "/cart", "/checkout", "/confirmation", "/product/not-a-product", "/nope-404"];

  for (const path of ROUTES) {
    test(`gtag.js requested exactly once with one #ga-src script: ${path}`, async ({ page, gaRequests }) => {
      await page.goto(path);
      await expect(page.locator("script#ga-src")).toHaveCount(1);
      await expect(page.locator("script[src*='googletagmanager.com']")).toHaveCount(1);
      await page.waitForFunction(() => (window as unknown as { __gtagStub?: boolean }).__gtagStub === true);
      await page.waitForTimeout(400);
      expect(gaRequests.map((r) => r.url())).toEqual([GA_URL]);
      await expect(page.locator("script#ga-src")).toHaveAttribute("src", GA_URL);
    });
  }

  test("/demo-controls (direct load): nothing GA at all", async ({ page, gaRequests }) => {
    await page.goto("/demo-controls");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(gaRequests).toHaveLength(0);
    await expect(page.locator("script[src*='googletagmanager.com'], script#ga-src")).toHaveCount(0);
    const st = await page.evaluate(() => {
      const w = window as unknown as { gtag?: unknown; dataLayer?: unknown[]; __gaInit?: unknown };
      return { gtag: typeof w.gtag, init: w.__gaInit, dl: w.dataLayer ? w.dataLayer.length : null };
    });
    expect(st.gtag).toBe("undefined");
    expect(st.init).toBeUndefined();
    // No config entry (dataLayer may not exist at all).
    expect(st.dl === null || st.dl === 0).toBe(true);
  });

  test("js and config come first, in order, once, even after several client-side navigations", async ({ page }) => {
    await page.goto("/");
    await waitPageView(page, 1);
    await page.getByTestId("hero-cta").click();
    await page.getByTestId("product-card-merino-base-tee").click();
    await page.getByTestId("pdp-size-M").click();
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("mini-cart-view-cart").click();
    await expect(page).toHaveURL(/\/cart$/);
    await page.getByTestId("proceed-to-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await waitPageView(page, 5);

    const dl = await readDL(page);
    expect(dl[0]).toEqual({ kind: "gtag", args: ["js", "__DATE__"] });
    expect(dl[1]).toEqual({ kind: "gtag", args: ["config", GA_ID] });
    const g = await gtagEntries(page);
    expect(g.filter((a) => a[0] === "js")).toHaveLength(1);
    expect(g.filter((a) => a[0] === "config")).toHaveLength(1);
    // The first plain event comes after both.
    const firstPlain = dl.findIndex((d) => d.kind === "plain");
    expect(firstPlain).toBeGreaterThan(1);
    // Exactly the Arguments shape (array-like, not a real array).
    const shape = await page.evaluate(() => {
      const e = (window as unknown as { dataLayer: unknown[] }).dataLayer[0];
      return { isArray: Array.isArray(e), tag: Object.prototype.toString.call(e) };
    });
    expect(shape).toEqual({ isArray: false, tag: "[object Arguments]" });
    // Plain objects stay plain objects.
    const plainShape = await page.evaluate(() => {
      const arr = (window as unknown as { dataLayer: { event?: string }[] }).dataLayer;
      const e = arr.find((x) => typeof x.event === "string")!;
      return Object.prototype.toString.call(e);
    });
    expect(plainShape).toBe("[object Object]");
  });

  test("js and config exist before the very first event when the first event is view_item on a PDP", async ({ page }) => {
    await page.goto(`/product/${tee.slug}`);
    await waitPageView(page, 1);
    const dl = await readDL(page);
    const idxConfig = dl.findIndex((d) => d.kind === "gtag" && d.args[0] === "config");
    const idxJs = dl.findIndex((d) => d.kind === "gtag" && d.args[0] === "js");
    const idxFirstEvent = dl.findIndex((d) => (d.kind === "plain") || (d.kind === "gtag" && d.args[0] === "event"));
    expect(idxJs).toBe(0);
    expect(idxConfig).toBe(1);
    expect(idxFirstEvent).toBeGreaterThan(1);
    expect(dl.filter((d) => d.kind === "gtag" && d.args[0] === "config")).toHaveLength(1);
  });

  test("window.dataLayer is never reassigned (pre-existing array identity kept, one array ever assigned)", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { dataLayer?: unknown[]; __dlAssigned: unknown[]; __dlPre: unknown[] };
      w.__dlAssigned = [];
      let value: unknown[] | undefined = [];
      w.__dlPre = value;
      Object.defineProperty(window, "dataLayer", {
        configurable: true,
        get: () => value,
        set: (v) => {
          w.__dlAssigned.push(v);
          value = v;
        },
      });
    });
    await page.goto("/");
    await waitPageView(page, 1);
    await page.getByTestId("hero-cta").click();
    await page.getByTestId("product-card-merino-base-tee").click();
    await waitPageView(page, 3);
    const r = await page.evaluate(() => {
      const w = window as unknown as { dataLayer: unknown[]; __dlAssigned: unknown[]; __dlPre: unknown[] };
      return { same: w.dataLayer === w.__dlPre, distinct: new Set(w.__dlAssigned).size, len: w.dataLayer.length };
    });
    expect(r.same).toBe(true);
    expect(r.distinct).toBeLessThanOrEqual(1);
    expect(r.len).toBeGreaterThan(5);
  });

  test("no manual gtag page_view on load or route change; non-ecommerce events are not forwarded", async ({ page }) => {
    await page.goto("/");
    await waitPageView(page, 1);
    await goNav(page, "bags");
    await waitPageView(page, 2);
    await page.getByTestId("product-card-field-tote").click();
    await waitPageView(page, 3);
    const g = await gtagEntries(page);
    expect(g.filter((a) => a[0] === "event" && a[1] === "page_view")).toHaveLength(0);
    // Only js, config and view_item (PDP mount) are allowed here.
    const names = g.map((a) => (a[0] === "event" ? `event:${a[1]}` : a[0]));
    expect(names).toEqual(["js", "config", "event:view_item"]);
  });

  test("full purchase journey: gtag events limited to the five ecommerce names, each once, same payload as the plain push", async ({ page }) => {
    await addTeeViaUi(page);
    await page.getByTestId("mini-cart-view-cart").click();
    await page.getByTestId("proceed-to-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await payAndConfirm(page);
    await expect.poll(async () => (await gtagEvents(page, "purchase")).length).toBe(1);

    const allowed = new Set(["view_item", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase"]);
    const ge = await gtagEvents(page);
    for (const e of ge) expect(allowed.has(e.name), e.name).toBe(true);
    expect(ge.map((e) => e.name)).toEqual(["view_item", "add_to_cart", "begin_checkout", "purchase"]);

    for (const n of ["view_item", "add_to_cart", "begin_checkout", "purchase"]) {
      const plain = (await plainEvents(page, n))[0].ecommerce;
      const gt = (await gtagEvents(page, n))[0].params;
      expect(gt, n).toEqual(plain);
    }
    // page_view, friction and anything else are never forwarded.
    const names = (await gtagEntries(page)).flatMap((a) => (a[0] === "event" ? [a[1]] : []));
    expect(names).not.toContain("page_view");
    const blob = JSON.stringify(await gtagEntries(page));
    expect(blob).not.toContain("@example.com");
    expect(blob).not.toContain("4242");
    expect(blob).not.toContain("friction");
    expect(blob).not.toContain("Trail");
  });

  test("remove_from_cart is forwarded to GA exactly once", async ({ page }) => {
    await seedCartInit(page, [{ slug: tee.slug, size: "M", qty: 1 }]);
    await page.goto("/cart");
    await page.getByTestId("cart-remove").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    const ge = await gtagEvents(page, "remove_from_cart");
    expect(ge).toHaveLength(1);
    expect(ge[0].params).toEqual((await plainEvents(page, "remove_from_cart"))[0].ecommerce);
  });

  test("two adds produce exactly two GA add_to_cart events", async ({ page }) => {
    await page.goto(`/product/${bySlug("wool-beanie").slug}`);
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    await page.getByTestId("mini-cart-close").click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("mini-cart")).toBeVisible();
    expect(await gtagEvents(page, "add_to_cart")).toHaveLength(2);
    expect(await plainEvents(page, "add_to_cart")).toHaveLength(2);
  });

  test("no console or page errors with GA active across the whole journey", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`);
    });
    await addTeeViaUi(page);
    await page.getByTestId("mini-cart-view-cart").click();
    await page.getByTestId("proceed-to-checkout").click();
    await payAndConfirm(page);
    await page.goto("/demo-controls");
    const gaish = errors.filter((e) => /gtag|google|dataLayer|analytics|contentsquare|_uxa/i.test(e));
    expect(gaish, gaish.join("\n")).toEqual([]);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("every request to a Google host is intercepted by the stub (no real network)", async ({ page, gaRequests }) => {
    const seen: string[] = [];
    const failed: string[] = [];
    const host = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com)$/;
    page.on("request", (r) => {
      if (host.test(new URL(r.url()).hostname)) seen.push(r.url());
    });
    page.on("requestfailed", (r) => failed.push(r.url()));
    await addTeeViaUi(page);
    await page.getByTestId("mini-cart-view-cart").click();
    await page.getByTestId("proceed-to-checkout").click();
    await payAndConfirm(page);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBe(gaRequests.length);
    expect(seen.every((u) => u.startsWith("https://www.googletagmanager.com/gtag/js"))).toBe(true);
    expect(failed).toEqual([]);
  });
});
