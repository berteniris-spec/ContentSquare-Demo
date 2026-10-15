import type { Product } from "@/lib/products";

// Extra editorial copy for the long (buriedCta) layout of the Trailhead 28 backpack.
const SPECS: [string, string][] = [
  ["Capacity", "28 litres"],
  ["Weight", "1.05 kg"],
  ["Back length", "46 cm, fixed"],
  ["Main fabric", "Recycled 420D nylon"],
  ["Lining", "Recycled 210D ripstop"],
  ["Water resistance", "PFC-free DWR finish"],
  ["Hydration", "2-litre sleeve and port"],
  ["Warranty", "Repairable for life"],
];

const CARE: string[] = [
  "Brush off dried mud, then rinse with lukewarm water and a soft sponge.",
  "Spot-clean with a mild soap. Do not machine wash or tumble dry.",
  "Air dry away from direct heat with every zip open.",
  "Reproof the water-repellent finish once a year with a wash-in treatment.",
  "Store loosely packed, never compressed, in a cool and dry place.",
];

/** Plain story block, placed after the description (clean layout). */
function ShortStory({ story }: { story: string[] }) {
  return (
    <section data-testid="pdp-story" aria-labelledby="pdp-story-heading" className="mt-10 max-w-prose space-y-4">
      <h2 id="pdp-story-heading" className="text-xl font-semibold">
        The story
      </h2>
      {story.map((para, i) => (
        <p key={i} className="text-base text-ink-2">
          {para}
        </p>
      ))}
    </section>
  );
}

/** Long editorial block with specs and care, placed above the purchase controls (buriedCta ON). */
function LongStory({ story }: { story: string[] }) {
  return (
    <section data-testid="pdp-story" aria-labelledby="pdp-story-heading" className="mt-8 max-w-prose space-y-4">
      <h2 id="pdp-story-heading" className="text-xl font-semibold">
        Built for the long climb
      </h2>
      {story.slice(0, 3).map((para, i) => (
        <p key={i} className="text-base text-ink-2">
          {para}
        </p>
      ))}
      <h2 className="pt-4 text-xl font-semibold">Materials</h2>
      {story.slice(3, 4).map((para, i) => (
        <p key={i} className="text-base text-ink-2">
          {para}
        </p>
      ))}
      <dl className="divide-y divide-line border-y border-line text-sm">
        {SPECS.map(([term, detail]) => (
          <div key={term} className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">{term}</dt>
            <dd className="text-right font-medium text-ink">{detail}</dd>
          </div>
        ))}
      </dl>
      <h2 className="pt-4 text-xl font-semibold">Care and repair</h2>
      {story.slice(4).map((para, i) => (
        <p key={i} className="text-base text-ink-2">
          {para}
        </p>
      ))}
      <ul className="list-disc space-y-2 pl-5 text-base text-ink-2">
        {CARE.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </section>
  );
}

export function ProductStory({ product, long }: { product: Product; long: boolean }) {
  if (!product.story) return null;
  return long ? <LongStory story={product.story} /> : <ShortStory story={product.story} />;
}
