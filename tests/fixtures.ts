import { test as base, expect, type Request } from "@playwright/test";

/**
 * Shared fixture: every test stubs the third-party tag hosts so no real data is ever sent.
 * - t.contentsquare.net requests are recorded in `csRequests` and answered with a no-op script.
 * - Google hosts (googletagmanager.com, google-analytics.com, analytics.google.com, doubleclick.net)
 *   are recorded in `gaRequests`. The gtag/js request gets a no-op script so window.dataLayer stays
 *   inspectable (gtag.js never runs); everything else gets an empty 204.
 */
type Fixtures = { csRequests: Request[]; gaRequests: Request[] };

export const test = base.extend<Fixtures>({
  csRequests: [
    async ({ page }, use) => {
      const requests: Request[] = [];
      await page.route(/https?:\/\/t\.contentsquare\.net\/.*/, async (route) => {
        requests.push(route.request());
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "/* contentsquare stub */ window.__csStub = true;",
        });
      });
      await use(requests);
    },
    { auto: true },
  ],
  gaRequests: [
    async ({ page }, use) => {
      const requests: Request[] = [];
      await page.route(
        /https?:\/\/([^/]+\.)?(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)\/.*/,
        async (route) => {
          const request = route.request();
          requests.push(request);
          if (/googletagmanager\.com\/gtag\/js/.test(request.url())) {
            await route.fulfill({
              status: 200,
              contentType: "application/javascript",
              body: "/* gtag stub */ window.__gtagStub = true;",
            });
          } else {
            await route.fulfill({ status: 204, body: "" });
          }
        },
      );
      await use(requests);
    },
    { auto: true },
  ],
});

export { expect };
