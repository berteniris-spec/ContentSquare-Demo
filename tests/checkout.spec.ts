import { PRODUCTS } from "../lib/products";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

const CART_KEY = "tw-cart-v1";
const ORDER_KEY = "tw-last-order";
const BANNER = "Demo store: no real payment is taken. Use any test details, e.g. 4242 4242 4242 4242.";
const bySlug = (s: string) => PRODUCTS.find((p) => p.slug === s)!;
const eur = (n: number) => `€${n.toFixed(2)}`;

type Line = { slug: string; qty?: number; colour?: string; size?: string };
function cartJson(lines: Line[], promoCode: string | null = null) {
  return JSON.stringify({
    items: lines.map((l) => {
      const p = bySlug(l.slug);
      return { productId: p.id, slug: p.slug, name: p.name, colour: l.colour ?? p.colours[0].slug, size: l.size, unitPrice: p.price, quantity: l.qty ?? 1 };
    }),
    promoCode,
  });
}
/** Seed the cart once (first navigation only, so later reloads keep real state). */
async function seed(page: Page, lines: Line[], promo: string | null = null) {
  await page.goto("/");
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [CART_KEY, cartJson(lines, promo)]);
}
const VALID = {
  email: "hiker@example.com",
  firstName: "Ada",
  lastName: "Trail",
  address: "Kade 1",
  city: "Amsterdam",
  postcode: "1234 AB",
  cardNumber: "4242 4242 4242 4242",
  cardExpiry: "12/30",
  cardCvc: "123",
};
async function fill(page: Page, v: Partial<typeof VALID> = {}) {
  const all = { ...VALID, ...v };
  for (const [k, val] of Object.entries(all)) await page.getByTestId(`checkout-${k}`).fill(val);
}
async function blurField(page: Page, field: string, value: string) {
  const el = page.getByTestId(`checkout-${field}`);
  await el.fill(value);
  await el.blur();
}

test.describe("full purchase flow", () => {
  test("home -> PLP -> PDP -> add -> cart -> checkout -> confirmation", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-cta").click();
    await page.getByTestId("product-card-merino-base-tee").click();
    await page.getByTestId("pdp-size-M").click();
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("mini-cart-view-cart").click();
    await expect(page).toHaveURL(/\/cart$/);
    const tee = bySlug("merino-base-tee");
    const line = page.getByTestId(`cart-line-${tee.id}:${tee.colours[0].slug}:M`);
    await expect(line).toBeVisible();
    await expect(line.getByRole("link", { name: tee.name })).toHaveAttribute("href", `/product/${tee.slug}`);
    await expect(page.getByTestId("cart-subtotal")).toHaveText(eur(tee.price));
    await expect(page.getByTestId("cart-shipping")).toHaveText(eur(6.95));
    await expect(page.getByTestId("cart-total")).toHaveText(eur(tee.price + 6.95));

    await page.getByTestId("proceed-to-checkout").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId("checkout-demo-banner")).toHaveText(BANNER);
    await expect(page.getByTestId("checkout-country")).toHaveValue("NL");
    await expect(page.getByTestId("shipping-standard")).toBeChecked();
    await fill(page);
    await page.getByTestId("shipping-express").check();
    await expect(page.getByTestId("checkout-summary-shipping")).toHaveText(eur(12.95));
    const total = tee.price + 12.95;
    await expect(page.getByTestId("checkout-summary-total")).toHaveText(eur(total));
    await expect(page.getByTestId("checkout-submit")).toHaveText(`Pay ${eur(total)}`);

    await page.getByTestId("checkout-submit").click();
    await expect(page.getByTestId("checkout-processing")).toBeVisible();
    await expect(page.getByTestId("checkout-submit")).toBeDisabled();
    await expect(page).toHaveURL(/\/confirmation$/, { timeout: 5000 });

    const num = page.getByTestId("confirmation-order-number");
    await expect(num).toHaveText(/^TW-\d{6}$/);
    const orderNumber = await num.textContent();
    await expect(page.getByText(VALID.email)).toBeVisible();
    await expect(page.getByTestId("confirmation-summary")).toContainText(tee.name);
    await expect(page.getByTestId("confirmation-summary")).toContainText("Express");
    await expect(page.getByTestId("confirmation-shipping")).toHaveText(eur(12.95));
    await expect(page.getByTestId("confirmation-total")).toHaveText(eur(total));
    await expect(page.getByTestId("continue-shopping")).toHaveAttribute("href", "/");

    // Cart and promo cleared; header count gone.
    await expect(page.getByTestId("header-cart-count")).toBeHidden();
    const cart = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), CART_KEY);
    expect(cart?.items ?? []).toEqual([]);
    expect(cart?.promoCode ?? null).toBeNull();

    // Order in sessionStorage, no card data anywhere.
    const order = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)!), ORDER_KEY);
    expect(order).toMatchObject({ orderNumber, email: VALID.email, shippingMethod: "express", total, currency: "EUR", shipping: 12.95 });
    const storageDump = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
    expect(storageDump).not.toMatch(/4242|12\/30|"123"|card/i);

    // Reload keeps the confirmation.
    await page.reload();
    await expect(page.getByTestId("confirmation-order-number")).toHaveText(orderNumber!);
    // Continue shopping -> home.
    await page.getByTestId("continue-shopping").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("fresh context: /confirmation shows no-order state", async ({ page }) => {
    await page.goto("/confirmation");
    await expect(page.getByTestId("confirmation-no-order")).toBeVisible();
    await expect(page.getByTestId("confirmation-no-order").getByRole("link")).toHaveAttribute("href", "/category/all");
    await expect(page.getByTestId("confirmation-order-number")).toHaveCount(0);
  });
});

test.describe("cart page", () => {
  test("qty change, bounds and remove; empty state", async ({ page }) => {
    const a = bySlug("wool-beanie");
    const b = bySlug("key-clip");
    await seed(page, [{ slug: a.slug }, { slug: b.slug, qty: 2 }]);
    await page.goto("/cart");
    const la = page.getByTestId(`cart-line-${a.id}:${a.colours[0].slug}:-`);
    const lb = page.getByTestId(`cart-line-${b.id}:${b.colours[0].slug}:-`);
    await expect(la.getByTestId("cart-qty-dec")).toBeDisabled();
    await la.getByTestId("cart-qty-inc").click();
    await expect(la.getByTestId("cart-qty-value")).toHaveText("2");
    await expect(la.getByTestId("cart-line-total")).toHaveText(eur(a.price * 2));
    await expect(page.getByTestId("cart-subtotal")).toHaveText(eur(a.price * 2 + b.price * 2));
    await expect(page.getByTestId("header-cart-count")).toHaveText("4");
    for (let i = 0; i < 10; i++) if (await lb.getByTestId("cart-qty-inc").isEnabled()) await lb.getByTestId("cart-qty-inc").click();
    await expect(lb.getByTestId("cart-qty-value")).toHaveText("10");
    await expect(lb.getByTestId("cart-qty-inc")).toBeDisabled();
    await lb.getByTestId("cart-qty-dec").click();
    await expect(lb.getByTestId("cart-qty-value")).toHaveText("9");

    // Persistence on reload.
    await page.reload();
    await expect(lb.getByTestId("cart-qty-value")).toHaveText("9");
    await expect(page.getByTestId("header-cart-count")).toHaveText("11");

    await lb.getByTestId("cart-remove").click();
    await expect(lb).toHaveCount(0);
    await expect(page.getByTestId("header-cart-count")).toHaveText("2");
    await la.getByTestId("cart-remove").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(page.getByTestId("proceed-to-checkout")).toHaveCount(0);
    await expect(page.getByTestId("cart-empty").getByRole("link")).toHaveAttribute("href", "/category/all");
    await expect(page.getByTestId("header-cart-count")).toBeHidden();
  });

  test("empty cart on fresh visit (after hydration) and empty checkout has no form", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-empty")).toBeVisible();
    await expect(page.getByTestId("checkout-empty").getByRole("link")).toHaveAttribute("href", "/category/all");
    await expect(page.getByTestId("checkout-email")).toHaveCount(0);
    await expect(page.getByTestId("checkout-submit")).toHaveCount(0);
  });
});

test.describe("promo DEMO10", () => {
  test("invalid code shows error and no discount", async ({ page }) => {
    await seed(page, [{ slug: "field-tote" }]);
    await page.goto("/cart");
    await page.getByTestId("promo-code-toggle").click();
    await expect(page.getByTestId("promo-code-toggle")).toHaveAttribute("aria-expanded", "true");
    for (const bad of ["DEMO11", "DEMO 10", "", "demo100"]) {
      await page.getByTestId("promo-code-input").fill(bad);
      await page.getByTestId("promo-code-apply").click();
      await expect(page.getByTestId("promo-code-message")).toHaveText("This code isn't valid");
      await expect(page.getByTestId("promo-code-message")).toHaveAttribute("aria-live", "polite");
      await expect(page.getByTestId("cart-discount")).toHaveCount(0);
    }
    await expect(page.getByTestId("cart-total")).toHaveText(eur(79));
  });

  for (const code of ["DEMO10", "demo10", "  Demo10  "]) {
    test(`valid code "${code}" applies, persists, carries to checkout, removable`, async ({ page }) => {
      await seed(page, [{ slug: "weekender-duffel" }]); // 159
      await page.goto("/cart");
      await page.getByTestId("promo-code-toggle").click();
      await page.getByTestId("promo-code-input").fill(code);
      await page.getByTestId("promo-code-apply").click();
      await expect(page.getByTestId("promo-code-message")).toContainText("DEMO10 applied");
      await expect(page.getByText("DEMO10 (-10%)")).toBeVisible();
      await expect(page.getByTestId("cart-discount")).toHaveText(`−${eur(15.9)}`);
      await expect(page.getByTestId("cart-shipping")).toHaveText("Free");
      await expect(page.getByTestId("cart-total")).toHaveText(eur(143.1));
      await page.reload();
      await expect(page.getByTestId("cart-discount")).toHaveText(`−${eur(15.9)}`);
      await page.goto("/checkout");
      await expect(page.getByTestId("checkout-summary-discount")).toHaveText(`−${eur(15.9)}`);
      await expect(page.getByTestId("checkout-summary-total")).toHaveText(eur(143.1));
      await page.goto("/cart");
      await page.getByTestId("promo-code-remove").click();
      await expect(page.getByTestId("cart-discount")).toHaveCount(0);
      await expect(page.getByTestId("cart-total")).toHaveText(eur(159));
    });
  }
});

test.describe("shipping threshold", () => {
  const cases: { name: string; lines: Line[]; promo: string | null; sub: number; disc: number; ship: number }[] = [
    { name: "under 75 -> 6.95", lines: [{ slug: "wool-beanie" }], promo: null, sub: 29, disc: 0, ship: 6.95 },
    { name: "exactly 75 -> free", lines: [{ slug: "key-clip", qty: 5 }], promo: null, sub: 75, disc: 0, ship: 0 },
    { name: "over 75 -> free", lines: [{ slug: "field-tote" }], promo: null, sub: 79, disc: 0, ship: 0 },
    { name: "79 with DEMO10 drops to 71.10 -> 6.95", lines: [{ slug: "field-tote" }], promo: "DEMO10", sub: 79, disc: 7.9, ship: 6.95 },
    { name: "75 with DEMO10 drops to 67.50 -> 6.95", lines: [{ slug: "key-clip", qty: 5 }], promo: "DEMO10", sub: 75, disc: 7.5, ship: 6.95 },
    { name: "85 with DEMO10 stays at 76.50 -> free", lines: [{ slug: "organic-hoodie" }], promo: "DEMO10", sub: 85, disc: 8.5, ship: 0 },
  ];
  for (const c of cases) {
    test(c.name, async ({ page }) => {
      await seed(page, c.lines, c.promo);
      await page.goto("/cart");
      const total = Math.round((c.sub - c.disc + c.ship) * 100) / 100;
      await expect(page.getByTestId("cart-subtotal")).toHaveText(eur(c.sub));
      await expect(page.getByTestId("cart-shipping")).toHaveText(c.ship ? eur(c.ship) : "Free");
      await expect(page.getByTestId("cart-total")).toHaveText(eur(total));
      if (c.ship) await expect(page.getByTestId("cart-free-shipping-hint")).toContainText(eur(75 - (c.sub - c.disc)));
      else await expect(page.getByTestId("cart-free-shipping-hint")).toHaveCount(0);
      await page.goto("/checkout");
      await expect(page.getByTestId("checkout-summary-shipping")).toHaveText(c.ship ? eur(c.ship) : "Free");
      await expect(page.getByTestId("checkout-summary-total")).toHaveText(eur(total));
      await page.getByTestId("shipping-express").check();
      await expect(page.getByTestId("checkout-summary-shipping")).toHaveText(eur(12.95));
      await expect(page.getByTestId("checkout-summary-total")).toHaveText(eur(Math.round((c.sub - c.disc + 12.95) * 100) / 100));
      await page.getByTestId("shipping-standard").check();
      await expect(page.getByTestId("checkout-summary-total")).toHaveText(eur(total));
    });
  }
});

test.describe("checkout validation (clean)", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, [{ slug: "wool-beanie" }]);
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-email")).toBeVisible();
  });

  test("submit empty: every required error, focus first invalid, aria wiring", async ({ page }) => {
    await page.getByTestId("checkout-submit").click();
    const fields = ["email", "firstName", "lastName", "address", "city", "postcode", "cardNumber", "cardExpiry", "cardCvc"];
    for (const f of fields) {
      await expect(page.getByTestId(`error-${f}`)).toBeVisible();
      await expect(page.getByTestId(`checkout-${f}`)).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByTestId(`checkout-${f}`)).toHaveAttribute("aria-describedby", new RegExp(`error-${f}`));
    }
    await expect(page.getByTestId("checkout-email")).toBeFocused();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId("checkout-processing")).toHaveCount(0);
  });

  test("focus moves to first invalid field when earlier fields are valid", async ({ page }) => {
    await fill(page, { postcode: "abc" });
    await page.getByTestId("checkout-submit").click();
    await expect(page.getByTestId("checkout-postcode")).toBeFocused();
    await expect(page.getByTestId("error-postcode")).toHaveText("Enter a postcode like 1234 AB");
  });

  test("errors appear on blur and clear when fixed", async ({ page }) => {
    await blurField(page, "firstName", "");
    await expect(page.getByTestId("error-firstName")).toBeVisible();
    await page.getByTestId("checkout-firstName").fill("Ada");
    await expect(page.getByTestId("error-firstName")).toHaveCount(0);
  });

  test("email format", async ({ page }) => {
    for (const bad of ["a", "a@b", "a@b.c", "a b@c.com", "@x.com"]) {
      await blurField(page, "email", bad);
      await expect(page.getByTestId("error-email"), bad).toBeVisible();
    }
    for (const ok of ["a@b.co", " name.last+tag@example.com "]) {
      await blurField(page, "email", ok);
      await expect(page.getByTestId("error-email"), ok).toHaveCount(0);
    }
  });

  const POSTCODES: Record<string, { ok: string[]; bad: string[] }> = {
    NL: { ok: ["1234 AB", "1234AB", "1234 ab", "1234ab", " 1234ab "], bad: ["1234", "12345", "1234 A", "AB 1234", "1234  AB"] },
    BE: { ok: ["1000", "9999"], bad: ["100", "1234AB", "abcd"] },
    DE: { ok: ["10115"], bad: ["1011", "101155", "1011A"] },
    FR: { ok: ["75001"], bad: ["7500", "750011", "75 001"] },
  };
  for (const [country, { ok, bad }] of Object.entries(POSTCODES)) {
    test(`postcode ${country}`, async ({ page }) => {
      await page.getByTestId("checkout-country").selectOption(country);
      for (const v of bad) {
        await blurField(page, "postcode", v);
        await expect(page.getByTestId("error-postcode"), `${country} "${v}"`).toContainText("Enter a postcode like");
      }
      for (const v of ok) {
        await blurField(page, "postcode", v);
        await expect(page.getByTestId("error-postcode"), `${country} "${v}"`).toHaveCount(0);
      }
    });
  }

  test("postcode re-validates on country change", async ({ page }) => {
    await blurField(page, "postcode", "1234 AB");
    await expect(page.getByTestId("error-postcode")).toHaveCount(0);
    await page.getByTestId("checkout-country").selectOption("DE");
    await expect(page.getByTestId("error-postcode")).toHaveText("Enter a postcode like 10115");
    await page.getByTestId("checkout-postcode").fill("10115");
    await expect(page.getByTestId("error-postcode")).toHaveCount(0);
    await page.getByTestId("checkout-country").selectOption("BE");
    await expect(page.getByTestId("error-postcode")).toBeVisible();
    await page.getByTestId("checkout-country").selectOption("FR");
    await expect(page.getByTestId("error-postcode")).toHaveCount(0);
  });

  test("card number 13-19 digits (spaces stripped, no Luhn)", async ({ page }) => {
    for (const bad of ["1234 5678 9012", "12345678901234567890", "4242 4242 4242 424a", "4242-4242-4242-4242"]) {
      await blurField(page, "cardNumber", bad);
      await expect(page.getByTestId("error-cardNumber"), bad).toBeVisible();
    }
    for (const ok of ["1234567890123", "4242 4242 4242 4242", "1111 1111 1111 1111 111", "1234567890123456"]) {
      await blurField(page, "cardNumber", ok);
      await expect(page.getByTestId("error-cardNumber"), ok).toHaveCount(0);
    }
  });

  test("expiry MM/YY, valid month, not in the past", async ({ page }) => {
    const now = new Date();
    const yy = (y: number) => String(y % 100).padStart(2, "0");
    const mm = (m: number) => String(m).padStart(2, "0");
    const thisMonth = `${mm(now.getMonth() + 1)}/${yy(now.getFullYear())}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${mm(prev.getMonth() + 1)}/${yy(prev.getFullYear())}`;
    for (const [bad, msg] of [
      ["1230", /MM\/YY/],
      ["13/30", /month/i],
      ["00/30", /month/i],
      [lastMonth, /expired/i],
      [`12/${yy(now.getFullYear() - 1)}`, /expired/i],
    ] as const) {
      await blurField(page, "cardExpiry", bad);
      await expect(page.getByTestId("error-cardExpiry"), bad).toHaveText(msg);
    }
    for (const ok of [thisMonth, `01/${yy(now.getFullYear() + 1)}`, "12/30"]) {
      await blurField(page, "cardExpiry", ok);
      await expect(page.getByTestId("error-cardExpiry"), ok).toHaveCount(0);
    }
  });

  test("CVC 3-4 digits", async ({ page }) => {
    for (const bad of ["12", "12345", "12a"]) {
      await blurField(page, "cardCvc", bad);
      await expect(page.getByTestId("error-cardCvc"), bad).toBeVisible();
    }
    for (const ok of ["123", "1234"]) {
      await blurField(page, "cardCvc", ok);
      await expect(page.getByTestId("error-cardCvc"), ok).toHaveCount(0);
    }
  });

  test("card inputs autocomplete=off; other fields have autocomplete", async ({ page }) => {
    for (const f of ["cardNumber", "cardExpiry", "cardCvc"]) {
      await expect(page.getByTestId(`checkout-${f}`)).toHaveAttribute("autocomplete", "off");
    }
    await expect(page.getByTestId("checkout-email")).toHaveAttribute("autocomplete", "email");
    await expect(page.getByTestId("checkout-postcode")).toHaveAttribute("autocomplete", "postal-code");
    for (const f of ["email", "firstName", "lastName", "address", "city", "postcode", "country", "cardNumber", "cardExpiry", "cardCvc"]) {
      await expect(page.getByTestId(`checkout-${f}`)).toHaveAccessibleName(/.+/);
    }
  });

  test("card values are not persisted or logged", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (m) => logs.push(m.text()));
    await fill(page, { postcode: "bad" });
    await page.getByTestId("checkout-submit").click();
    await page.reload();
    await expect(page.getByTestId("checkout-cardNumber")).toHaveValue("");
    const dump = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
    expect(dump).not.toMatch(/4242/);
    expect(logs.join("\n")).not.toMatch(/4242/);
  });
});
