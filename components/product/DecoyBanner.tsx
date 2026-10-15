"use client";

import { ArrowRightIcon } from "@/components/ui/icons";
import { useFlag } from "@/lib/flags/FlagsProvider";

/**
 * decoyBanner (friction): looks like a promo link but is a plain, non-interactive div
 * (no href, no handler, not focusable). Renders nothing when the flag is OFF.
 */
export function DecoyBanner() {
  if (!useFlag("decoyBanner")) return null;
  return (
    <div
      data-testid="plp-decoy-banner"
      className="mb-4 flex cursor-pointer select-none items-center justify-between rounded-md bg-accent px-4 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover md:mb-6"
    >
      <span>Seasonal edit: new colours just landed</span>
      <ArrowRightIcon size={18} />
    </div>
  );
}
