import type { Rng } from "./rng";
import {
  S,
  addToCart,
  buildCart,
  dwellOnPage,
  fillCheckout,
  goCheckout,
  gotoCategory,
  openProduct,
  randomProducts,
  submitOrder,
  tryPromo,
  viewCart,
} from "./session";
import { pickEntry } from "./entries";

export interface Persona {
  id: string;
  name: string;
  share: number;
  forcePhone?: boolean;
  /** Probability that the session is closed abruptly mid-page. */
  abrupt: number;
  entry(rng: Rng): string;
  run(s: S): Promise<string>; // returns the outcome
}

const heroLoaded = (s: S) =>
  s.page
    .waitForFunction(
      () => {
        const img = document.querySelector<HTMLImageElement>('[data-testid="hero-image"]');
        return !!img && img.complete && img.naturalWidth > 0;
      },
      undefined,
      { timeout: 15000 },
    )
    .then(() => true)
    .catch(() => false);

export const PERSONAS: Persona[] = [
  {
    id: "bouncer",
    name: "Bouncer",
    share: 25,
    abrupt: 0.3,
    entry: (r) => (r.chance(0.7) ? "/" : pickEntry(r)),
    async run(s) {
      const t0 = Date.now();
      if (s.path() === "/") {
        const ok = await heroLoaded(s);
        s.log(ok ? "waited for the hero image" : "hero image did not finish loading");
        s.note(`hero ready after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      }
      await s.mouseWander(2);
      if (s.rng.chance(0.5)) await s.scroll(s.rng.int(200, 600));
      await s.pause(2, 8);
      s.log("left");
      return "bounce";
    },
  },
  {
    id: "browser",
    name: "Browser",
    share: 20,
    abrupt: 0.15,
    entry: (r) => pickEntry(r),
    async run(s) {
      if (s.path() === "/") {
        await s.mouseWander(2);
        await s.pause(2, 5);
        await s.click(s.tid("hero-cta"));
        await s.waitUrl(/\/category\//);
        s.log("clicked hero CTA");
      } else if (s.path().startsWith("/product/")) {
        await dwellOnPage(s, 700);
        await gotoCategory(s, s.rng.pick(["bags", "apparel", "accessories"]));
      }
      await s.pause(2, 6);
      const sort = s.tid("plp-sort");
      if (await sort.isVisible().catch(() => false)) {
        const v = s.rng.pick(["price-asc", "price-desc"]);
        await sort.selectOption(v);
        s.log(`sorted ${v}`);
        await s.pause(2, 5);
      }
      await s.scroll(s.rng.int(400, 1000));
      const cat = s.path().split("/")[2] ?? "all";
      const picks = randomProducts(s.rng, s.rng.int(2, 3)).filter((p) => cat === "all" || p.category === cat);
      const list = picks.length ? picks : randomProducts(s.rng, 2).filter((p) => p.category === cat);
      let seen = 0;
      for (const p of list) {
        const card = s.tid(`product-card-${p.slug}`);
        if (!(await card.first().isVisible().catch(() => false))) continue;
        await openProduct(s, p.slug);
        await dwellOnPage(s, s.rng.int(300, 1200));
        seen++;
        if (s.rng.chance(0.6)) {
          await s.page.goBack();
          s.log("went back");
          await s.pause(2, 4);
        }
      }
      return seen ? "exit (browsed)" : "exit";
    },
  },
  {
    id: "promo",
    name: "Promo hunter",
    share: 10,
    abrupt: 0.1,
    entry: (r) => pickEntry(r, { path: "/product/hip-pack", chance: 0.3 }),
    async run(s) {
      await openProduct(s, "hip-pack");
      await dwellOnPage(s, 500);
      await addToCart(s);
      await s.pause(2, 5);
      await viewCart(s);
      await s.pause(2, 6);
      await tryPromo(s, s.rng.shuffle(["SAVE20", "WELCOME", "FREESHIP"]).slice(0, s.rng.int(1, 2)));
      await tryPromo(s, ["DEMO10"]);
      await s.pause(3, 8);
      if (s.rng.chance(0.55)) {
        s.log("left the cart");
        return "cart abandoned";
      }
      await goCheckout(s);
      await s.pause(3, 8);
      await s.type(s.tid("checkout-email"), `persona-${s.rng.int(100000, 999999)}@example.com`);
      await s.pause(2, 6);
      s.log("abandoned checkout");
      return "checkout abandoned";
    },
  },
  {
    id: "rage",
    name: "Rage clicker",
    share: 8,
    abrupt: 0.1,
    entry: (r) => pickEntry(r, { path: "/product/field-tote", chance: 0.4 }),
    async run(s) {
      await openProduct(s, "field-tote");
      await dwellOnPage(s, 300);
      const moss = s.tid("pdp-swatch-moss");
      const n = s.rng.int(5, 8);
      await moss.scrollIntoViewIfNeeded();
      for (let i = 0; i < n; i++) {
        await s.click(moss, { timeout: 5000 });
        await s.page.waitForTimeout(s.rng.int(120, 450));
      }
      s.log(`clicked Moss x${n}`);
      await s.pause(2, 5);
      if (s.rng.chance(0.5)) {
        await s.click(s.tid("pdp-swatch-charcoal"));
        s.log("picked Charcoal instead");
        await s.pause(2, 4);
      }
      return "exit";
    },
  },
  {
    id: "silent",
    name: "Silent size",
    share: 7,
    abrupt: 0.1,
    entry: (r) => pickEntry(r, { path: "/product/storm-shell-jacket", chance: 0.4 }),
    async run(s) {
      await openProduct(s, "storm-shell-jacket");
      await dwellOnPage(s, 400);
      const n = s.rng.int(3, 5);
      for (let i = 0; i < n; i++) {
        await s.click(s.tid("add-to-cart"));
        await s.page.waitForTimeout(s.rng.int(500, 1600));
      }
      s.log(`clicked Add to cart x${n} without a size`);
      await s.pause(2, 5);
      if (s.rng.chance(0.5)) {
        await addToCart(s);
        await s.pause(2, 4);
        return "added after picking a size";
      }
      return "exit";
    },
  },
  {
    id: "mobile",
    name: "Mobile scroller",
    share: 10,
    forcePhone: true,
    abrupt: 0.1,
    entry: (r) => pickEntry(r, { path: "/product/trailhead-28-backpack", chance: 0.3 }),
    async run(s) {
      if (!s.path().startsWith("/product/")) {
        await gotoCategory(s, s.rng.chance(0.7) ? "bags" : "all");
        await s.pause(2, 4);
        const banner = s.tid("plp-decoy-banner");
        if (await banner.isVisible().catch(() => false)) {
          const taps = s.rng.int(1, 3);
          for (let i = 0; i < taps; i++) {
            await s.click(banner);
            await s.page.waitForTimeout(s.rng.int(300, 900));
          }
          s.log(`tapped the Seasonal edit banner x${taps}`);
          await s.pause(1, 4);
        }
      }
      await openProduct(s, "trailhead-28-backpack");
      await s.scroll(s.rng.int(1500, 2600), 220);
      await s.pause(2, 5);
      if (s.rng.chance(0.4)) {
        await s.scroll(-3000, 400);
        const ok = await addToCart(s);
        await s.pause(2, 4);
        return ok ? "added to cart" : "exit";
      }
      return "exit";
    },
  },
  {
    id: "postcode",
    name: "Postcode struggler",
    share: 5,
    abrupt: 0,
    entry: (r) => pickEntry(r),
    async run(s) {
      await buildCart(s, 1);
      await viewCart(s);
      await s.pause(2, 5);
      await goCheckout(s);
      await fillCheckout(s, { postcodeAttempts: ["1234 AB", "1234 AB", "1234AB"] });
      if (s.rng.chance(0.4)) {
        s.log("abandoned checkout");
        return "checkout abandoned";
      }
      await submitOrder(s);
      return s.state.purchased ? "purchase" : "checkout stuck";
    },
  },
  {
    id: "express",
    name: "Express error victim",
    share: 5,
    abrupt: 0,
    entry: (r) => pickEntry(r),
    async run(s) {
      await buildCart(s, 1);
      await viewCart(s);
      await s.pause(2, 4);
      await goCheckout(s);
      await fillCheckout(s, { postcode: "1012AB", express: true });
      await submitOrder(s);
      return s.state.purchased ? "purchase" : "checkout stuck";
    },
  },
  {
    id: "happy",
    name: "Happy buyer",
    share: 10,
    abrupt: 0,
    entry: (r) => pickEntry(r),
    async run(s) {
      await buildCart(s, s.rng.int(1, 2));
      await viewCart(s);
      await s.pause(2, 5);
      await tryPromo(s, ["DEMO10"]);
      await goCheckout(s);
      await fillCheckout(s, { postcode: "1234AB" });
      await submitOrder(s);
      return s.state.purchased ? "purchase" : "checkout stuck";
    },
  },
];
