import { getBySlug, getCategory } from "@/lib/products";

export type PageType =
  | "home"
  | "plp"
  | "pdp"
  | "cart"
  | "checkout"
  | "confirmation"
  | "demo-controls"
  | "not-found";

/** Maps a pathname to the `data-page-type` value. Unknown paths and unknown slugs are `not-found`. */
export function pathToPageType(pathname: string): PageType {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return "home";
  if (p === "/cart") return "cart";
  if (p === "/checkout") return "checkout";
  if (p === "/confirmation") return "confirmation";
  if (p === "/demo-controls" || p.startsWith("/demo-controls/")) return "demo-controls";
  const parts = p.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "category") {
    return parts[1] === "all" || getCategory(parts[1]) ? "plp" : "not-found";
  }
  if (parts.length === 2 && parts[0] === "product") return getBySlug(parts[1]) ? "pdp" : "not-found";
  return "not-found";
}
