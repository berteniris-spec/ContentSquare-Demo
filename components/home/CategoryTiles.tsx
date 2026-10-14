import Link from "next/link";
import { ProductImage } from "@/components/product/svg/ProductImage";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getBySlug, type CategorySlug } from "@/lib/products";

const TILES: { slug: CategorySlug; label: string; product: string }[] = [
  { slug: "bags", label: "Bags", product: "roll-top-pack" },
  { slug: "apparel", label: "Apparel", product: "canvas-overshirt" },
  { slug: "accessories", label: "Accessories", product: "wool-beanie" },
];

export function CategoryTiles() {
  return (
    <section aria-labelledby="categories-heading" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <h2 id="categories-heading" className="mb-6 text-2xl font-semibold tracking-tight md:mb-8">
        Shop by category
      </h2>
      <div className="grid gap-4 sm:grid-cols-3 md:gap-6">
        {TILES.map((tile) => {
          const product = getBySlug(tile.product);
          return (
            <Link
              key={tile.slug}
              href={`/category/${tile.slug}`}
              data-testid={`category-tile-${tile.slug}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-image sm:aspect-[4/5] md:aspect-[3/4]"
            >
              {product && (
                <ProductImage
                  product={product}
                  decorative
                  className="transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                />
              )}
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-md bg-surface px-4 py-2.5 text-base font-medium text-ink shadow-sm">
                {tile.label}
                <ArrowRightIcon size={18} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
