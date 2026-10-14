"use client";

import type { Product, ProductView } from "@/lib/products";
import { ProductImage } from "./svg/ProductImage";

export function ProductGallery({
  product,
  colour,
  view,
  onViewChange,
}: {
  product: Product;
  colour: string;
  view: ProductView;
  onViewChange: (v: ProductView) => void;
}) {
  return (
    <div className="lg:flex lg:flex-row-reverse lg:items-start lg:gap-4">
      <div data-testid="pdp-gallery-main" className="aspect-[4/5] overflow-hidden rounded-lg bg-image lg:min-w-0 lg:flex-1">
        <ProductImage product={product} colour={colour} view={view} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3 lg:mt-0 lg:flex-col lg:flex-nowrap">
        {product.views.map((v, i) => {
          const active = v === view;
          return (
            <button
              key={v}
              type="button"
              data-testid={`pdp-thumb-${i}`}
              aria-label={`Show ${v} view`}
              aria-pressed={active}
              onClick={() => onViewChange(v)}
              className={`h-25 w-20 overflow-hidden rounded-md bg-image ${active ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-line-strong"}`}
            >
              <ProductImage product={product} colour={colour} view={v} decorative />
            </button>
          );
        })}
      </div>
    </div>
  );
}
