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
 * Contentsquare virtual page view (route changes only; the tag sends the first one itself),
 * friction dynamic variables, and the dataLayer page_view. Render inside <Suspense>.
 */
export function RouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { flags, profile, ready } = useFlags();
  const { consent } = useConsent();
  const last = useRef<string | null>(null);
  const path = pathname + (search ? `?${search}` : "");

  useEffect(() => {
    if (!ready || consent !== "accepted" || last.current === path) return;
    const initial = last.current === null;
    last.current = path;
    if (!initial) trackVirtualPageview(path);
    pushFrictionVariables(flags, profile);
    track("page_view", {
      page_type: pathToPageType(pathname),
      page_path: path,
      friction: frictionState(flags),
      friction_profile: profile,
    });
  }, [ready, consent, path, pathname, flags, profile]);

  return null;
}
