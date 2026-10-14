import { CategoryTiles } from "@/components/home/CategoryTiles";
import { FeaturedRow } from "@/components/home/FeaturedRow";
import { Hero } from "@/components/home/Hero";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { ValuesStrip } from "@/components/home/ValuesStrip";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryTiles />
      <FeaturedRow />
      <ValuesStrip />
      <NewsletterSignup />
    </>
  );
}
