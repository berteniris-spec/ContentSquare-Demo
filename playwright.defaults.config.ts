import { defineConfig, devices } from "@playwright/test";

/**
 * Shipped-default shape: a real production build with every NEXT_PUBLIC_FRICTION_* variable UNSET
 * (8 flags ON, expressShippingError OFF, profile baseline). Own port (3300), memory store, never the real store.
 *   npm run test:defaults
 * SAFETY: FLAG_STORE is explicit and all KV_/UPSTASH_ vars are blanked, so .env.local is never used for the store.
 */
const PORT = 3300;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests-defaults",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      FLAG_STORE: "memory",
      DEMO_CONTROLS_PIN: "246810",
      PORT: String(PORT),
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    },
  },
});
