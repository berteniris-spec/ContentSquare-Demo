import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

export function Hero() {
  return (
    <section data-testid="hero" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        <div>
          <p className="text-sm font-medium text-accent">Autumn 2026</p>
          <h1 className="mt-3 text-display font-semibold tracking-tight">Gear for days that run long.</h1>
          <p className="mt-4 max-w-prose text-lg text-ink-2">
            Packs, layers and small essentials made to last, and to be repaired when they don’t.
          </p>
          <div className="mt-8">
            <ButtonLink href="/category/all" data-testid="hero-cta" className="w-full sm:w-auto">
              Shop all products
            </ButtonLink>
          </div>
        </div>
        <div className="mt-10 aspect-[5/4] overflow-hidden rounded-xl bg-image lg:mt-0">
          <Image
            data-testid="hero-image"
            src="/images/hero.svg"
            alt=""
            width={1200}
            height={960}
            unoptimized
            priority
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
