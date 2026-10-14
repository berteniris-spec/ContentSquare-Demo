import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlpListing, PlpListingFallback } from "@/components/product/PlpListing";
import { pluralise } from "@/lib/format";
import { CATEGORIES, getByCategory, getCategory } from "@/lib/products";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return { title: category?.name ?? "Page not found" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const products = getByCategory(category.slug);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-6 md:mb-8">
        <h1 data-testid="plp-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
          {category.name}
        </h1>
        <p data-testid="plp-count" className="mt-2 text-sm text-muted">
          {pluralise(products.length, "product")}
        </p>
      </div>
      <Suspense fallback={<PlpListingFallback products={products} />}>
        <PlpListing products={products} />
      </Suspense>
    </div>
  );
}
