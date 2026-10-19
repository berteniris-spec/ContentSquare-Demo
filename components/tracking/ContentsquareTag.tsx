"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { isUntrackedPath } from "@/lib/tracking/ga";
import { CS_ENABLED, CS_SRC } from "@/lib/tracking/uxa";

/** Contentsquare tag. Loads for every visitor (no consent needed); renders nothing when disabled or on /demo-controls. */
export function ContentsquareTag() {
  const pathname = usePathname();
  if (!CS_ENABLED || !CS_SRC || isUntrackedPath(pathname)) return null;
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
