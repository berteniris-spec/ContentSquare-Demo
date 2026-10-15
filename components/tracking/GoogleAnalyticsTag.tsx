"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { ensureGtag, GA_ENABLED, GA_SRC, isUntrackedPath } from "@/lib/tracking/ga";

/** GA4 gtag.js. Renders nothing without consent, when disabled or on /demo-controls. */
export function GoogleAnalyticsTag() {
  const pathname = usePathname();
  const { consent } = useConsent();
  const active = consent === "accepted" && GA_ENABLED && !!GA_SRC && !isUntrackedPath(pathname);

  useEffect(() => {
    if (active) ensureGtag();
  }, [active]);

  if (!active || !GA_SRC) return null;
  return <Script id="ga-src" src={GA_SRC} strategy="afterInteractive" />;
}
