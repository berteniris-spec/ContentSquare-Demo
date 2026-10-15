import { execSync } from "node:child_process";
import { consentState } from "./tests/consent-state";
import { defineConfig, devices } from "@playwright/test";

/**
 * M6 live-toggle / control-panel suite. Separate from the main config because these tests MUTATE the
 * global flag store (in-memory, per server process) and so must not run alongside other specs.
 * One build, five `next start` servers, one worker (serial):
 *   3000 memory store, PIN 246810        (tests-panel/panel.spec.ts)
 *   3101 FLAG_STORE=none                 (tests-panel/fallback.spec.ts)
 *   3102 memory store, PIN empty         (tests-panel/fallback.spec.ts)
 *   3103 memory store + VERCEL=1         (memory refused at runtime -> unconfigured)
 *   3104 FLAG_STORE=upstash with a FAKE unreachable URL (store failing path; GET only, never POST)
 * Run: npm run test:m6
 * SAFETY: every server sets FLAG_STORE explicitly and overrides all KV_/UPSTASH_ vars, so .env.local
 * (real Upstash credentials) is never used and the real store is never written.
 */
const NEXT_PUBLIC_OFF = {
  NEXT_PUBLIC_FRICTION_PROMO_FIELD: "off",
  NEXT_PUBLIC_FRICTION_SHIPPING_SURPRISE: "off",
  NEXT_PUBLIC_FRICTION_DECOY_BANNER: "off",
  NEXT_PUBLIC_FRICTION_BURIED_CTA: "off",
  NEXT_PUBLIC_FRICTION_DEAD_SWATCH: "off",
  NEXT_PUBLIC_FRICTION_SILENT_SIZE: "off",
  NEXT_PUBLIC_FRICTION_SLOW_HERO: "off",
  NEXT_PUBLIC_FRICTION_POSTCODE_VALIDATION: "off",
  NEXT_PUBLIC_FRICTION_EXPRESS_SHIPPING_ERROR: "off",
};

if (!process.env.TW_M6_BUILT) {
  // Config is also loaded inside workers; the env flag set here is inherited, so the build runs once.
  execSync("npm run build", { stdio: "inherit", env: { ...process.env, ...NEXT_PUBLIC_OFF, FLAG_STORE: "memory" } });
  process.env.TW_M6_BUILT = "1";
}

// Seeds consent for every port the suite uses (tests may navigate to any of the five servers).
const panelConsent = () => ({
  cookies: [],
  origins: [3000, 3101, 3102, 3103, 3104].flatMap((p) => consentState(`http://localhost:${p}`).origins),
});

const FAKE_UPSTASH = {
  KV_REST_API_URL: "http://127.0.0.1:9",
  KV_REST_API_TOKEN: "fake-token",
  KV_REST_API_READ_ONLY_TOKEN: "fake-token",
  KV_URL: "",
  REDIS_URL: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
};
const NO_UPSTASH = { KV_REST_API_URL: "", KV_REST_API_TOKEN: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" };

const server = (port: number, env: Record<string, string>) => ({
  command: `npx next start -p ${port}`,
  url: `http://localhost:${port}`,
  timeout: 120_000,
  reuseExistingServer: false,
  env: { ...NEXT_PUBLIC_OFF, PORT: String(port), ...env },
});

export default defineConfig({
  testDir: "./tests-panel",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", storageState: panelConsent() },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: [
    server(3000, { FLAG_STORE: "memory", DEMO_CONTROLS_PIN: "246810", ...FAKE_UPSTASH }), // memory must win over (fake) Upstash vars
    server(3101, { FLAG_STORE: "none", DEMO_CONTROLS_PIN: "246810", ...FAKE_UPSTASH }),
    server(3102, { FLAG_STORE: "memory", DEMO_CONTROLS_PIN: "", ...NO_UPSTASH }),
    server(3103, { FLAG_STORE: "memory", DEMO_CONTROLS_PIN: "246810", VERCEL: "1", ...NO_UPSTASH }),
    server(3104, { FLAG_STORE: "upstash", DEMO_CONTROLS_PIN: "246810", ...FAKE_UPSTASH }),
  ],
});
