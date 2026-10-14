import { test as base, expect, type Request } from "@playwright/test";

/**
 * Shared fixture: every test stubs the Contentsquare tag host so no real data is sent.
 * Requests to t.contentsquare.net are recorded in `csRequests` and answered with a no-op script.
 */
type Fixtures = { csRequests: Request[] };

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
});

export { expect };
