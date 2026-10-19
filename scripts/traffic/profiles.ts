import { devices, type BrowserContextOptions } from "@playwright/test";
import type { Rng } from "./rng";

export type DeviceKind = "desktop" | "phone" | "tablet";

export interface Profile {
  kind: DeviceKind;
  label: string;
  mobile: boolean;
  options: BrowserContextOptions;
}

const LOCALES = [
  { value: { locale: "nl-NL", timezoneId: "Europe/Amsterdam" }, weight: 60 },
  { value: { locale: "en-GB", timezoneId: "Europe/London" }, weight: 15 },
  { value: { locale: "de-DE", timezoneId: "Europe/Berlin" }, weight: 15 },
  { value: { locale: "en-US", timezoneId: "America/New_York" }, weight: 10 },
];

const DESKTOP_SIZES = [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1600, 900],
  [1680, 1050],
  [1920, 1080],
  [1280, 800],
];

const PHONES = ["iPhone 14", "Pixel 7", "iPhone 13", "Galaxy S9+"];

/** Strip "HeadlessChrome" from any UA (Playwright's headless shell advertises it). */
export function cleanUa(ua: string): string {
  return ua.replace(/HeadlessChrome/g, "Chrome");
}

export function pickProfile(rng: Rng, chromeMajor: string, forcePhone = false): Profile {
  const loc = rng.weighted(LOCALES);
  const kind: DeviceKind = forcePhone
    ? "phone"
    : rng.weighted<DeviceKind>([
        { value: "desktop", weight: 55 },
        { value: "phone", weight: 35 },
        { value: "tablet", weight: 10 },
      ]);

  if (kind === "desktop") {
    const [w, h] = rng.pick(DESKTOP_SIZES);
    const width = w + rng.int(-40, 0);
    const height = h - rng.int(60, 140); // browser chrome
    const mac = rng.chance(0.5);
    const os = mac ? "Macintosh; Intel Mac OS X 10_15_7" : "Windows NT 10.0; Win64; x64";
    return {
      kind,
      label: `Desktop Chrome ${mac ? "macOS" : "Windows"} ${width}x${height}`,
      mobile: false,
      options: {
        ...loc,
        viewport: { width, height },
        deviceScaleFactor: rng.pick([1, 1, 2]),
        userAgent: `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`,
      },
    };
  }

  const name = kind === "tablet" ? "iPad (gen 7)" : rng.pick(PHONES);
  const d = devices[name];
  return {
    kind,
    label: name,
    mobile: true,
    options: { ...d, ...loc, userAgent: cleanUa(d.userAgent) },
  };
}
