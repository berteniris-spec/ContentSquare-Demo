import { consentState } from "./tests/consent-state";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure", storageState: consentState(baseURL),
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      // iPhone 13 metrics (390x844, touch, mobile UA) rendered in Chromium.
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      FLAG_STORE: "memory",
      DEMO_CONTROLS_PIN: "246810",
      PORT: String(PORT),
      // Existing specs assert the clean (flags OFF) behaviour. Friction specs flip flags per test
      // with ?friction=<flag>:on (URL overrides beat these build-time env defaults).
      NEXT_PUBLIC_FRICTION_PROMO_FIELD: "off",
      NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE: "off",
      NEXT_PUBLIC_FRICTION_DECOY_BANNER: "off",
      NEXT_PUBLIC_FRICTION_BURIED_CTA: "off",
      NEXT_PUBLIC_FRICTION_DEAD_SWATCH: "off",
      NEXT_PUBLIC_FRICTION_SILENT_SIZE: "off",
      NEXT_PUBLIC_FRICTION_SLOW_HERO: "off",
      NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION: "off",
      NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR: "off",
    },
  },
});
