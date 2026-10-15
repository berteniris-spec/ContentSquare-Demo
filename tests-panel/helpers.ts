import type { APIRequestContext, Browser, BrowserContext, Page, TestInfo } from "@playwright/test";
import { FLAG_KEYS, type FlagKey } from "../lib/config";
import { PRODUCTS } from "../lib/products";

export const PIN = "246810";
export const H = { "x-demo-pin": PIN };
export const API = "/api/demo-controls/flags";
export const BASE = "http://localhost:3000";
export { FLAG_KEYS };
export type { FlagKey };

/** Third-party tag hosts are always stubbed: a test must never send real analytics data. */
export async function stubTags(target: Page | BrowserContext) {
  await target.route(/https?:\/\/([^/]+\.)?(t\.contentsquare\.net|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" }),
  );
}

/** A brand-new visitor: new browser context (no sessionStorage overrides, no cart), same device profile as the project. */
export async function newVisitor(browser: Browser, info: TestInfo, baseURL = BASE) {
  const ctx = await browser.newContext({ ...(info.project.use as object), baseURL });
  await stubTags(ctx);
  const page = await ctx.newPage();
  return { ctx, page };
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

export async function setFlag(request: APIRequestContext, flag: FlagKey, value: boolean, base = "") {
  const res = await request.post(`${base}${API}`, { headers: H, data: { action: "toggle", flag, value } });
  if (!res.ok()) throw new Error(`setFlag ${flag} failed ${res.status()}`);
  return res.json();
}
export async function master(request: APIRequestContext, action: "all_on" | "all_off" | "only_fix_errors", base = "") {
  const res = await request.post(`${base}${API}`, { headers: H, data: { action } });
  if (!res.ok()) throw new Error(`master ${action} failed ${res.status()}`);
  return res.json();
}
export async function state(request: APIRequestContext, base = "") {
  const res = await request.get(`${base}${API}`, { headers: H });
  return res.json();
}

const bySlug = (s: string) => PRODUCTS.find((p) => p.slug === s)!;
export async function seedCart(page: Page, slug = "hip-pack", qty = 1) {
  const p = bySlug(slug);
  await page.goto("/");
  await page.evaluate(
    (cart) => localStorage.setItem("tw-cart-v1", cart),
    JSON.stringify({ items: [{ productId: p.id, slug, name: p.name, colour: p.colours[0].slug, unitPrice: p.price, quantity: qty }], promoCode: null }),
  );
}

export async function unlockPanel(page: Page, pin = PIN) {
  await page.goto("/demo-controls");
  await page.getByTestId("pin-input").fill(pin);
  await page.getByTestId("pin-submit").click();
  await page.getByTestId("store-status").waitFor();
}

/** Opens /checkout and waits until the /api/flags fetch of the flag provider has settled. */
export async function openCheckout(page: Page, query = "") {
  const settled = page.waitForResponse((r) => r.url().includes("/api/flags") && r.request().method() === "GET");
  await page.goto(`/checkout${query}`);
  await settled;
  await page.getByTestId("checkout-postcode").waitFor();
  await page.waitForTimeout(400); // let the provider state flush after the response
}
