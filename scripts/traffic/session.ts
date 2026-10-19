import type { Locator, Page } from "@playwright/test";
import type { Rng } from "./rng";
import { PRODUCTS } from "../../lib/products";

/** Thrown to end a session abruptly (tab closed mid-page). */
export class AbruptEnd extends Error {}

export interface SessionState {
  purchased: boolean;
  orderNumber?: string;
  orderValue?: string;
  stuckAtPay?: boolean;
  pageErrors: number;
}

export class S {
  readonly actions: string[] = [];
  readonly notes: string[] = [];
  readonly state: SessionState = { purchased: false, pageErrors: 0 };
  private abortIn: number;

  constructor(
    readonly page: Page,
    readonly rng: Rng,
    readonly base: string,
    readonly mobile: boolean,
    private readonly pace: number,
    abruptChance: number,
  ) {
    this.abortIn = rng.chance(abruptChance) ? rng.int(3, 12) : Infinity;
    page.on("pageerror", () => {
      this.state.pageErrors++;
    });
  }

  log(action: string) {
    this.actions.push(action);
  }
  note(text: string) {
    this.notes.push(text);
  }

  /** Human-like pause (seconds, scaled by --pace). May end the session abruptly. */
  async pause(minS = 2, maxS = 10) {
    if (--this.abortIn <= 0) {
      this.log("closed the tab mid-page");
      throw new AbruptEnd();
    }
    await this.page.waitForTimeout(Math.max(120, this.rng.float(minS, maxS) * 1000 * this.pace));
  }
  /** Short pause that never aborts (between micro-actions). */
  async beat(minMs = 200, maxMs = 700) {
    await this.page.waitForTimeout(Math.max(40, this.rng.float(minMs, maxMs) * Math.min(1, this.pace * 2)));
  }

  path(): string {
    return new URL(this.page.url()).pathname;
  }

  async mouseWander(times = 3) {
    if (this.mobile) return;
    const vp = this.page.viewportSize() ?? { width: 1280, height: 720 };
    for (let i = 0; i < times; i++) {
      await this.page.mouse.move(this.rng.int(40, vp.width - 40), this.rng.int(80, vp.height - 40), { steps: this.rng.int(6, 18) });
      await this.beat(80, 300);
    }
  }

  /** Scroll down in steps (wheel on desktop, scrollBy on touch devices). */
  async scroll(totalPx: number, stepPx = 280) {
    let done = 0;
    const dir = totalPx < 0 ? -1 : 1;
    while (done < Math.abs(totalPx)) {
      const d = Math.min(stepPx + this.rng.int(-60, 80), Math.abs(totalPx) - done) * dir;
      if (this.mobile) await this.page.evaluate((y) => window.scrollBy(0, y), d);
      else await this.page.mouse.wheel(0, d);
      done += Math.abs(d);
      await this.beat(250, 900);
    }
  }

  /** Move the pointer over the element and click (tap on touch devices). */
  async click(loc: Locator, opts: { timeout?: number } = {}) {
    const timeout = opts.timeout ?? 10000;
    const target = loc.first();
    await target.waitFor({ state: "visible", timeout });
    // Centre it (a sticky header would otherwise cover elements scrolled to the very top).
    await target.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await this.beat(150, 500);
    if (this.mobile) {
      await target.tap({ timeout });
      return;
    }
    // Smooth scrolling / layout shifts: wait until the box stops moving before aiming.
    let box = await target.boundingBox();
    for (let i = 0; i < 15 && box; i++) {
      await this.page.waitForTimeout(100);
      const again = await target.boundingBox();
      const still = !!again && Math.abs(again.x - box.x) < 1 && Math.abs(again.y - box.y) < 1;
      box = again;
      if (still) break;
    }
    if (box) {
      const x = box.x + box.width * this.rng.float(0.25, 0.75);
      const y = box.y + box.height * this.rng.float(0.3, 0.7);
      await this.page.mouse.move(x, y, { steps: this.rng.int(8, 20) });
      await this.beat(80, 350);
      await this.page.mouse.click(x, y);
    } else {
      await target.click({ timeout });
    }
  }

  tid(id: string): Locator {
    return this.page.getByTestId(id);
  }

  async type(loc: Locator, text: string) {
    await loc.scrollIntoViewIfNeeded();
    await loc.click();
    await loc.pressSequentially(text, { delay: this.rng.int(35, 100) });
  }

  async waitUrl(re: RegExp, timeout = 10000) {
    await this.page.waitForURL(re, { timeout });
  }

  /** Best effort: wait ~3 s for the Contentsquare / GA tag to appear. */
  async waitForTags() {
    await this.page
      .waitForFunction(
        () => {
          const w = window as unknown as Record<string, unknown>;
          return Boolean(w._uxa) || Boolean(document.querySelector('script[src*="contentsquare"], script[src*="googletagmanager"]'));
        },
        undefined,
        { timeout: 3000 },
      )
      .catch(() => undefined);
  }
}

// ---------- Shared navigation helpers ----------

const SELLABLE = PRODUCTS.filter((p) => p.stock !== "out_of_stock");
export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug)!;
export const randomProducts = (rng: Rng, n: number, exclude: string[] = []) =>
  rng.shuffle(SELLABLE.filter((p) => !exclude.includes(p.slug))).slice(0, n);

/** Go to a category via the nav (desktop link, or the mobile menu), falling back to a direct URL. */
export async function gotoCategory(s: S, slug: string) {
  if (s.path() === `/category/${slug}`) return;
  s.log(`opened /category/${slug}`);
  const desktop = s.tid(`nav-link-${slug}`);
  try {
    if (await desktop.first().isVisible()) {
      await s.click(desktop);
    } else {
      await s.click(s.tid("mobile-menu-button"));
      await s.beat(300, 800);
      await s.click(s.tid(`mobile-nav-link-${slug}`));
    }
    await s.waitUrl(new RegExp(`/category/${slug}`));
  } catch {
    await s.page.goto(new URL(`/category/${slug}`, s.base).toString());
  }
  await s.beat(500, 1200);
}

/** Open a product page: click its card when visible, else go via its category. */
export async function openProduct(s: S, slug: string) {
  if (s.path() === `/product/${slug}`) return;
  const card = s.tid(`product-card-${slug}`);
  if (!(await card.first().isVisible().catch(() => false))) {
    await gotoCategory(s, productBySlug(slug).category);
  }
  s.log(`opened ${slug}`);
  await s.click(card);
  await s.waitUrl(new RegExp(`/product/${slug}`));
  await s.beat(500, 1200);
}

export async function dwellOnPage(s: S, scrollPx = 900) {
  await s.mouseWander(s.rng.int(1, 3));
  await s.scroll(scrollPx);
  await s.pause(2, 6);
}

/** Pick the first size (if the product has sizes) then Add to cart. Returns true when the mini cart opened. */
export async function addToCart(s: S): Promise<boolean> {
  const sizes = s.page.locator('[data-testid^="pdp-size-"]:not([data-testid="pdp-size-error"]):not([disabled])');
  if ((await sizes.count()) > 0) {
    const n = await sizes.count();
    await s.click(sizes.nth(Math.min(n - 1, s.rng.int(1, Math.max(1, n - 1)))));
    await s.beat(300, 900);
  }
  // The page may not be hydrated yet on the first click: retry until the mini cart opens.
  for (let attempt = 0; attempt < 3; attempt++) {
    await s.click(s.tid("add-to-cart"));
    try {
      await s.tid("mini-cart").waitFor({ state: "visible", timeout: 3000 });
      s.log("added to cart");
      return true;
    } catch {
      await s.beat(500, 1000);
    }
  }
  if (process.env.TRAFFIC_DEBUG) await s.page.screenshot({ path: `${process.env.TRAFFIC_DEBUG}/add-fail-${Date.now()}.png` });
  s.log("add to cart did not respond");
  return false;
}

export async function viewCart(s: S) {
  if (await s.tid("mini-cart-view-cart").isVisible().catch(() => false)) await s.click(s.tid("mini-cart-view-cart"));
  else await s.click(s.tid("header-cart-button"));
  await s.waitUrl(/\/cart$/);
  s.log("viewed cart");
}

export async function tryPromo(s: S, codes: string[]) {
  const toggle = s.tid("promo-code-toggle");
  // Flags resolve client side: wait for either variant, let it settle, then look again.
  await s.page.locator('[data-testid="promo-code-toggle"], [data-testid="promo-code-input"]').first().waitFor({ state: "visible", timeout: 10000 });
  await s.beat(600, 900);
  if (await toggle.isVisible().catch(() => false)) {
    await s.click(toggle);
    s.log("opened promo field");
    await s.beat(300, 800);
  }
  for (const code of codes) {
    const input = s.tid("promo-code-input");
    await input.fill("");
    await s.type(input, code);
    await s.beat(300, 900);
    await s.click(s.tid("promo-code-apply"));
    await s.beat(500, 1000);
    const msg = ((await s.tid("promo-code-message").first().textContent().catch(() => "")) ?? "").trim();
    s.log(`promo ${code}: ${msg || "no message"}`);
    await s.pause(2, 5);
  }
}

export async function goCheckout(s: S) {
  await s.click(s.tid("proceed-to-checkout"));
  await s.waitUrl(/\/checkout$/);
  s.log("started checkout");
}

export interface CheckoutOpts {
  postcode?: string;
  express?: boolean;
  /** Postcode flow for the struggler: try these first, blur after each. */
  postcodeAttempts?: string[];
}

function personName(rng: Rng) {
  const first = rng.pick(["Sanne", "Daan", "Emma", "Lars", "Mila", "Noah", "Eva", "Finn", "Julia", "Tim"]);
  const last = rng.pick(["de Vries", "Jansen", "Bakker", "Visser", "Smit", "Meijer", "Bos", "Mulder"]);
  return { first, last };
}

/** Fill the (demo) checkout form with fake data and test card. Does not submit. */
export async function fillCheckout(s: S, opts: CheckoutOpts = {}) {
  const { first, last } = personName(s.rng);
  const email = `persona-${s.rng.int(100000, 999999)}@example.com`;
  const field = (n: string) => s.tid(`checkout-${n}`);
  await s.type(field("email"), email);
  await s.beat(300, 900);
  await s.type(field("firstName"), first);
  await s.type(field("lastName"), last);
  await s.type(field("address"), "Kade 1");
  await s.type(field("city"), "Amsterdam");
  const attempts = opts.postcodeAttempts ?? [opts.postcode ?? "1234AB"];
  for (const pc of attempts) {
    await field("postcode").fill("");
    await s.type(field("postcode"), pc);
    await field("postcode").blur();
    await s.beat(600, 1200);
    const err = await s.tid("error-postcode").textContent({ timeout: 800 }).catch(() => null);
    s.log(`postcode ${pc}: ${err ? `error "${err.trim()}"` : "accepted"}`);
    if (attempts.length > 1) await s.pause(2, 5);
  }
  if (opts.express) {
    await s.click(s.tid("shipping-express"));
    s.log("chose Express shipping");
    await s.beat(500, 1200);
  }
  await s.pause(1, 4);
  await s.type(field("cardNumber"), "4242 4242 4242 4242");
  await s.type(field("cardExpiry"), "12/30");
  await s.type(field("cardCvc"), "123");
  await s.pause(1, 3);
}

/** Press Pay and wait for the confirmation. Marks state; never throws on a stuck Pay. */
export async function submitOrder(s: S) {
  await s.click(s.tid("checkout-submit"));
  s.log("pressed Pay");
  try {
    await s.waitUrl(/\/confirmation$/, 15000);
    const num = await s.tid("confirmation-order-number").textContent({ timeout: 5000 }).catch(() => null);
    s.state.purchased = true;
    s.state.orderNumber = num?.trim();
    s.state.orderValue = (await s.tid("confirmation-total").textContent({ timeout: 2000 }).catch(() => null))?.trim();
    s.log(`order placed ${s.state.orderNumber ?? ""}`.trim());
    await s.pause(2, 6);
  } catch {
    s.state.stuckAtPay = true;
    s.log("Pay did not complete");
    s.note(`pay stuck, ${s.state.pageErrors} page error(s)`);
  }
}

/** Browse a bit, add one or two items, end up in the cart. */
export async function buildCart(s: S, items = 1) {
  const picks = randomProducts(s.rng, items);
  for (let i = 0; i < picks.length; i++) {
    await openProduct(s, picks[i].slug);
    await dwellOnPage(s, 600);
    const ok = await addToCart(s);
    if (!ok) s.note("mini cart did not open");
    await s.pause(2, 5);
    if (i < picks.length - 1) {
      if (await s.tid("mini-cart-close").isVisible().catch(() => false)) await s.click(s.tid("mini-cart-close"));
      await gotoCategory(s, picks[i + 1].category);
    }
  }
}
