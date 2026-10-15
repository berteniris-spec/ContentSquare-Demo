"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { pathToPageType } from "@/lib/tracking/pageType";

/** Keeps document.body.dataset.pageType in step with the route. */
export function PageTypeSync() {
  const pathname = usePathname();
  useEffect(() => {
    document.body.dataset.pageType = pathToPageType(pathname);
  }, [pathname]);
  return null;
}
