"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseSort, sortProducts, type Product, type SortKey } from "@/lib/products";
import { DecoyBanner } from "./DecoyBanner";
import { ProductGrid } from "./ProductGrid";
import { SortSelect } from "./SortSelect";

function Listing({
  products,
  sort,
  onSortChange,
}: {
  products: Product[];
  sort: SortKey;
  onSortChange?: (s: SortKey) => void;
}) {
  return (
    <>
      <DecoyBanner />
      <div className="mb-6 flex justify-end md:mb-8">
        <SortSelect value={sort} onChange={onSortChange} disabled={!onSortChange} />
      </div>
      <ProductGrid products={sortProducts(products, sort)} testId="plp-grid" />
    </>
  );
}

/** Static fallback (featured order) rendered into the HTML before search params are known. */
export function PlpListingFallback({ products }: { products: Product[] }) {
  return <Listing products={products} sort="featured" />;
}

/** Client listing: reads ?sort= and updates it with router.replace (no scroll jump). */
export function PlpListing({ products }: { products: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sort = parseSort(searchParams.get("sort"));

  function onSortChange(next: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return <Listing products={products} sort={sort} onSortChange={onSortChange} />;
}
