import { defineConfig, devices } from "@playwright/test";

/**
 * Build-time variants of the tracking tags. Run one variant per invocation (each rebuilds .next on port 3000):
 *   VARIANT=disabled npx playwright test -c playwright.variants.config.ts
 *   VARIANT=override | invalid | dev  (dev = `next dev`, React Strict Mode double effects)
 */
const VARIANT = process.env.VARIANT ?? "disabled";
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

const base = {
  FLAG_STORE: "memory",
  DEMO_CONTROLS_PIN: "246810",
  PORT: String(PORT),
  NEXT_PUBLIC_FRICTION_PROMO_FIELD: "off",
  NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE: "off",
  NEXT_PUBLIC_FRICTION_DECOY_BANNER: "off",
  NEXT_PUBLIC_FRICTION_BURIED_CTA: "off",
  NEXT_PUBLIC_FRICTION_DEAD_SWATCH: "off",
  NEXT_PUBLIC_FRICTION_SILENT_SIZE: "off",
  NEXT_PUBLIC_FRICTION_SLOW_HERO: "off",
  NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION: "off",
  NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR: "off",
} as Record<string, string>;

const variantEnv: Record<string, Record<string, string>> = {
  disabled: { NEXT_PUBLIC_GA_ENABLED: "false", NEXT_PUBLIC_CS_ENABLED: "false" },
  override: { NEXT_PUBLIC_GA_ID: "G-TESTOVER12", NEXT_PUBLIC_CS_TAG_ID: "abc123def456" },
  invalid: { NEXT_PUBLIC_GA_ID: "not a valid id", NEXT_PUBLIC_CS_TAG_ID: "bad id/../x" },
  dev: {},
};

export default defineConfig({
  testDir: "./tests-variants",
  fullyParallel: false,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    command: VARIANT === "dev" ? `npm run dev -- -p ${PORT}` : `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { ...base, ...variantEnv[VARIANT] },
  },
});
