import { PRODUCTS } from "../lib/products";
import { expect } from "./fixtures";
import type { Page } from "@playwright/test";

export const GA_ID = "G-4PLJ26X0Y9";
export const CS_URL = "https://t.contentsquare.net/uxa/506730812ef03.js";
export const CART_KEY = "tw-cart-v1";

export const bySlug = (s: string) => PRODUCTS.find((p) => p.slug === s)!;

export type Plain = Record<string, unknown> & { event: string };
export type DLEntry = { kind: "plain"; entry: Plain } | { kind: "gtag"; args: unknown[] };

type W = {
  dataLayer?: unknown[];
  _uxa?: unknown[][];
  gtag?: unknown;
  __csLoaded?: boolean;
  __gaInit?: boolean;
};

/** Whole window.dataLayer, each entry classified as a plain track() object or a gtag() Arguments entry. */
export async function readDL(page: Page): Promise<DLEntry[]> {
  return page.evaluate(() => {
    const w = window as unknown as W;
    return (w.dataLayer ?? []).map((raw) => {
      const e = raw as { event?: unknown } & ArrayLike<unknown>;
      if (typeof e.event === "string") return { kind: "plain" as const, entry: JSON.parse(JSON.stringify(e)) };
      return { kind: "gtag" as const, args: Array.from(e).map((a) => (a instanceof Date ? "__DATE__" : a)) };
    });
  });
}

export async function plainEvents(page: Page, name?: string): Promise<Plain[]> {
  const dl = await readDL(page);
  return dl.flatMap((d) => (d.kind === "plain" && (!name || d.entry.event === name) ? [d.entry] : []));
}

export async function gtagEntries(page: Page): Promise<unknown[][]> {
  const dl = await readDL(page);
  return dl.flatMap((d) => (d.kind === "gtag" ? [d.args] : []));
}

export async function gtagEvents(page: Page, name?: string): Promise<{ name: string; params: Record<string, unknown> }[]> {
  const g = await gtagEntries(page);
  return g
    .filter((a) => a[0] === "event" && (!name || a[1] === name))
    .map((a) => ({ name: a[1] as string, params: a[2] as Record<string, unknown> }));
}

export async function uxa(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as W)._uxa ?? [])));
}

/** Wait until the page_view for the current load has been pushed (flags ready). */
export async function waitPageView(page: Page, count = 1) {
  await expect.poll(async () => (await plainEvents(page, "page_view")).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(count);
}

export async function waitCsLoaded(page: Page) {
  await page.waitForFunction(() => (window as unknown as W).__csLoaded === true, null, { timeout: 15_000 });
}

type Line = { slug: string; qty?: number; colour?: string; size?: string };
export function cartJson(lines: Line[], promoCode: string | null = null) {
  return JSON.stringify({
    items: lines.map((l) => {
      const p = bySlug(l.slug);
      return { productId: p.id, slug: p.slug, name: p.name, colour: l.colour ?? p.colours[0].slug, size: l.size, unitPrice: p.price, quantity: l.qty ?? 1 };
    }),
    promoCode,
  });
}

/** Seed the cart in localStorage before any app code runs (new document on every navigation, only if empty). */
export async function seedCartInit(page: Page, lines: Line[], promo: string | null = null) {
  const json = cartJson(lines, promo);
  await page.addInitScript(
    ([k, v]) => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, v);
    },
    [CART_KEY, json],
  );
}

export const VALID = {
  email: "hiker.private@example.com",
  firstName: "Ada",
  lastName: "Trail",
  address: "Kade 1",
  city: "Amsterdam",
  postcode: "1234 AB",
  cardNumber: "4242 4242 4242 4242",
  cardExpiry: "12/30",
  cardCvc: "123",
};

export async function fillCheckout(page: Page) {
  for (const [k, val] of Object.entries(VALID)) await page.getByTestId(`checkout-${k}`).fill(val);
}

/** Submit a valid checkout and wait for the confirmation page. */
export async function payAndConfirm(page: Page) {
  await fillCheckout(page);
  await page.getByTestId("checkout-submit").click();
  await expect(page).toHaveURL(/\/confirmation$/, { timeout: 15_000 });
  await expect(page.getByTestId("confirmation-order-number")).toBeVisible();
}
