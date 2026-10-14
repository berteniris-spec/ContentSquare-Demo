import { getRelated, type Product } from "@/lib/products";
import { ProductGrid } from "./ProductGrid";

export function RelatedProducts({ product }: { product: Product }) {
  return (
    <section data-testid="related-products" aria-labelledby="related-heading" className="mt-10 md:mt-16">
      <h2 id="related-heading" className="mb-6 text-2xl font-semibold tracking-tight md:mb-8">
        You may also like
      </h2>
      <ProductGrid products={getRelated(product, 4)} />
    </section>
  );
}
