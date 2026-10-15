import { PRODUCTS } from "../lib/products";
import { expect, test } from "./fixtures";

const PATHS = ["/", "/demo-controls", "/api/flags"];

test.describe("security headers", () => {
  test.skip(({ isMobile }) => isMobile, "headers are viewport independent");

  for (const path of PATHS) {
    test(`headers on ${path}`, async ({ request }) => {
      const res = await request.get(path);
      const h = res.headers();
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=()");
      expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
      const csp = h["content-security-policy"];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("https://www.googletagmanager.com");
      expect(csp).toContain("https://*.contentsquare.net");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  }

  test("/api/flags keeps its cache header", async ({ request }) => {
    const res = await request.get("/api/flags");
    expect(res.headers()["cache-control"]).toMatch(/s-maxage=/);
  });

  test("no CSP violations with tags allowed (consent seeded, tags stubbed)", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/content security policy|violates the following/i.test(m.text())) violations.push(m.text());
    });
    for (const path of ["/", `/product/${PRODUCTS[0].slug}`, "/cart", "/checkout", "/confirmation"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    expect(violations).toEqual([]);
  });
});
