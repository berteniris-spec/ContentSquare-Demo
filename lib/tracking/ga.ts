// Google Analytics 4 (gtag.js) helpers. Env vars are read with literal process.env.NEXT_PUBLIC_* so Next inlines them.
const RAW_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-4PLJ26X0Y9";
const RAW_ENABLED = process.env.NEXT_PUBLIC_GA_ENABLED;

/** Measurement id, only when it looks like `G-XXXX` (never put an unchecked value into a script URL). */
export const GA_ID: string | null = /^G-[A-Z0-9]+$/.test(RAW_ID.trim()) ? RAW_ID.trim() : null;
export const GA_ENABLED: boolean = RAW_ENABLED !== "false" && GA_ID !== null;

export const GA_SRC = GA_ID ? `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` : null;

/** Pages without tracking (internal control panel). */
export function isUntrackedPath(pathname: string): boolean {
  return pathname === "/demo-controls" || pathname.startsWith("/demo-controls/");
}

/**
 * Idempotent gtag bootstrap: shares window.dataLayer (never reassigned once it exists), defines
 * gtag() so it pushes `arguments` (gtag.js ignores arrays), and queues `js` + `config` exactly once.
 * Returns true when GA is active on this page.
 */
export function ensureGtag(): boolean {
  if (typeof window === "undefined" || !GA_ENABLED || !GA_ID) return false;
  if (isUntrackedPath(window.location.pathname)) return false;
  if (window.__gaInit) return true;
  window.__gaInit = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
  return true;
}

/** gtag('event', name, params). No-op when GA is off. */
export function sendGaEvent(name: string, params?: unknown): void {
  if (!ensureGtag()) return;
  window.gtag!("event", name, params);
}
