"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useConsent } from "@/lib/consent";
import { isUntrackedPath } from "@/lib/tracking/ga";
import { CS_ENABLED, CS_SRC } from "@/lib/tracking/uxa";

/** Contentsquare tag. Renders nothing without consent, when disabled or on /demo-controls. */
export function ContentsquareTag() {
  const pathname = usePathname();
  const { consent } = useConsent();
  if (consent !== "accepted" || !CS_ENABLED || !CS_SRC || isUntrackedPath(pathname)) return null;
  return (
    <>
      <Script id="cs-init" strategy="afterInteractive">
        {"window._uxa = window._uxa || [];"}
      </Script>
      <Script
        id="cs-src"
        src={CS_SRC}
        strategy="afterInteractive"
        onLoad={() => {
          window.__csLoaded = true;
        }}
      />
    </>
  );
}
