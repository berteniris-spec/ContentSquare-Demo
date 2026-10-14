import { CATEGORIES } from "@/lib/products";

export const NAV_LINKS = CATEGORIES.map((c) => ({
  slug: c.slug,
  label: c.name,
  href: `/category/${c.slug}`,
}));
