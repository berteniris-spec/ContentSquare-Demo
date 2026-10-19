import type { Rng } from "./rng";

const UTM = [
  "/?utm_source=newsletter&utm_medium=email&utm_campaign=spring",
  "/category/bags?utm_source=instagram&utm_medium=social&utm_campaign=bags-reel",
  "/product/field-tote?utm_source=google&utm_medium=cpc&utm_campaign=tote-search",
  "/category/apparel?utm_source=newsletter&utm_medium=email&utm_campaign=layers",
  "/?utm_source=instagram&utm_medium=social&utm_campaign=story",
  "/?utm_source=google&utm_medium=cpc&utm_campaign=brand",
];

/** Generic entry mix (guide section 4). A persona may pass a preferred direct path. */
export function pickEntry(rng: Rng, preferred?: { path: string; chance: number }): string {
  if (preferred && rng.chance(preferred.chance)) return preferred.path;
  return rng.weighted([
    { value: "/", weight: 40 },
    { value: "/category/all", weight: 10 },
    { value: "/category/bags", weight: 10 },
    { value: "/category/apparel", weight: 8 },
    { value: UTM[0], weight: 7 },
    { value: UTM[1], weight: 6 },
    { value: UTM[2], weight: 5 },
    { value: UTM[3], weight: 4 },
    { value: UTM[4], weight: 5 },
    { value: UTM[5], weight: 5 },
  ]);
}

/** Append consent=accept to an entry path (utm params are kept). */
export function withConsent(base: string, path: string): string {
  const url = new URL(path, base);
  url.searchParams.set("consent", "accept");
  return url.toString();
}
