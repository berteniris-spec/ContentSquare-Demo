import Link from "next/link";
import type { Product } from "@/lib/products";
import { Price } from "@/components/ui/Price";
import { pluralise } from "@/lib/format";
import { ProductImage } from "./svg/ProductImage";

function StockBadge({ stock }: { stock: Product["stock"] }) {
  if (stock === "low_stock")
    return (
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
        Low stock
      </span>
    );
  if (stock === "out_of_stock")
    return (
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink-2">
        Sold out
      </span>
    );
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      data-testid={`product-card-${product.slug}`}
      className="group block rounded-lg focus-visible:outline-offset-4"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-image">
        <ProductImage
          product={product}
          decorative
          className="transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
        />
        <StockBadge stock={product.stock} />
      </div>
      <p className="mt-3 text-base font-medium text-ink underline-offset-4 group-hover:underline">
        {product.name}
      </p>
      <Price amount={product.price} className="block text-base text-ink" />
      <p className="text-sm text-muted">{pluralise(product.colours.length, "colour")}</p>
    </Link>
  );
}
