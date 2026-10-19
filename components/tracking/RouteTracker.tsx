"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { useFlags } from "@/lib/flags/FlagsProvider";
import { pathToPageType } from "@/lib/tracking/pageType";
import { track } from "@/lib/tracking/track";
import { frictionState, pushFrictionVariables, trackVirtualPageview } from "@/lib/tracking/uxa";

/**
 * One page view per location (pathname + search) once flags are ready:
 * Contentsquare virtual page view + friction dynamic variables (no consent needed), and the
 * dataLayer/GA page_view (consent required). Render inside <Suspense>.
 */
export function RouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { flags, profile, ready } = useFlags();
  const { consent } = useConsent();
  const csLast = useRef<string | null>(null);
  const gaLast = useRef<string | null>(null);
  const path = pathname + (search ? `?${search}` : "");

  // Contentsquare: no consent needed. The tag sends the first page view itself.
  useEffect(() => {
    if (!ready || csLast.current === path) return;
    const initial = csLast.current === null;
    csLast.current = path;
    if (!initial) trackVirtualPageview(path);
    pushFrictionVariables(flags, profile);
  }, [ready, path, flags, profile]);

  // Google Analytics / dataLayer: only after Accept (also fires right after Accept for the current page).
  useEffect(() => {
    if (!ready || consent !== "accepted" || gaLast.current === path) return;
    gaLast.current = path;
    track("page_view", {
      page_type: pathToPageType(pathname),
      page_path: path,
      friction: frictionState(flags),
      friction_profile: profile,
    });
  }, [ready, consent, path, pathname, flags, profile]);

  return null;
}
