import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/PurchasePanel";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { PRODUCTS, getBySlug } from "@/lib/products";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getBySlug(slug);
  return product ? { title: product.name, description: product.description } : { title: "Page not found" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <ProductDetail product={product} />
      <RelatedProducts product={product} />
    </div>
  );
}
