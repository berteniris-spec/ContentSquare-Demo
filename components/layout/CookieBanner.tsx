"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { applyConsentParam, setConsent, useConsent } from "@/lib/consent";
import { isUntrackedPath } from "@/lib/tracking/ga";

const BUTTON =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink hover:bg-sunken sm:flex-none";

/** Analytics consent. Google Analytics only loads after Accept (GoogleAnalyticsTag); Contentsquare loads for everyone. */
export function CookieBanner() {
  const pathname = usePathname();
  const { consent, ready } = useConsent();
  const ref = useRef<HTMLDivElement>(null);
  const visible = ready && consent === "unknown" && !isUntrackedPath(pathname);

  // Demo override: ?consent=accept|decline|reset, applied once on mount.
  useEffect(() => {
    applyConsentParam();
  }, []);

  // Keep focus and the page end clear of the fixed banner (WCAG 2.4.11).
  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.scrollPaddingBottom = `${el.offsetHeight}px`;
      document.body.style.paddingBottom = `${el.offsetHeight}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingBottom = "";
      document.body.style.paddingBottom = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Cookie consent"
      data-testid="cookie-banner"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-safe shadow-banner"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <p className="text-sm text-ink-2 sm:flex-1">
          We use Google Analytics cookies to understand how this demo store is used. We also run Contentsquare to analyse
          sessions.
        </p>
        <div className="flex gap-3">
          <button type="button" data-testid="cookie-decline" className={BUTTON} onClick={() => setConsent("declined")}>
            Decline
          </button>
          <button type="button" data-testid="cookie-accept" className={BUTTON} onClick={() => setConsent("accepted")}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
