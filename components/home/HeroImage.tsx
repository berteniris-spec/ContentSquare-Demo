"use client";

import Image from "next/image";
import { useFlag, useFlags } from "@/lib/flags/FlagsProvider";

/**
 * Hero picture inside the reserved frame. Until the flags are settled on the client the lightweight static SVG
 * is shown (priority, so no empty frame), and /api/hero-image is only requested when slowHero resolves ON.
 * slowHero ON: the delayed, oversized SVG swaps in. OFF: the static SVG simply stays.
 */
export function HeroImage() {
  const { ready } = useFlags();
  const slow = useFlag("slowHero");
  const useSlow = ready && slow;
  return (
    <Image
      // Remount on swap so the frame stays blank until the slow image arrives (otherwise the painted static SVG stays visible).
      key={useSlow ? "slow" : "static"}
      data-testid="hero-image"
      src={useSlow ? "/api/hero-image" : "/images/hero.svg"}
      alt=""
      width={1200}
      height={960}
      unoptimized
      priority
      className="h-full w-full object-cover"
    />
  );
}
