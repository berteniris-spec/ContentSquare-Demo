import Link from "next/link";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getFeatured } from "@/lib/products";

export function FeaturedRow() {
  return (
    <section
      data-testid="featured-row"
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8"
    >
      <div className="mb-6 flex items-baseline justify-between gap-4 md:mb-8">
        <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight">
          Featured
        </h2>
        <Link
          href="/category/all"
          className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline decoration-1 underline-offset-4 hover:text-accent-hover"
        >
          View all
        </Link>
      </div>
      <ProductGrid products={getFeatured().slice(0, 4)} />
    </section>
  );
}
