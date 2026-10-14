"use client";

import { useRef } from "react";
import type { Colour } from "@/lib/products";

export function ColourSwatches({
  colours,
  value,
  onChange,
}: {
  colours: Colour[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = colours.find((c) => c.slug === value) ?? colours[0];

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + colours.length) % colours.length;
    refs.current[next]?.focus();
    onChange(colours[next].slug);
  }

  return (
    <div>
      <p className="text-sm text-ink-2" id="pdp-colour-label">
        Colour: <span className="font-medium text-ink">{selected.name}</span>
      </p>
      <div role="radiogroup" aria-label="Colour" className="mt-2 flex flex-wrap gap-2">
        {colours.map((c, i) => {
          const checked = c.slug === selected.slug;
          return (
            <button
              key={c.slug}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={c.name}
              tabIndex={checked ? 0 : -1}
              data-testid={`pdp-swatch-${c.slug}`}
              onClick={() => onChange(c.slug)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative grid size-11 place-items-center rounded-full transition-shadow duration-150 ${
                checked ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : "hover:ring-2 hover:ring-line-strong"
              }`}
            >
              <span className="size-8 rounded-full ring-1 ring-inset ring-ink/15" style={{ backgroundColor: c.hex }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
