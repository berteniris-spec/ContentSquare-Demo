"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { FieldError } from "@/components/ui/Field";

export interface SizeSelectorHandle {
  focusFirst: () => void;
}

export const SizeSelector = forwardRef<
  SizeSelectorHandle,
  { sizes: string[]; value: string | null; onChange: (size: string) => void; error: string | null }
>(function SizeSelector({ sizes, value, onChange, error }, ref) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useImperativeHandle(ref, () => ({ focusFirst: () => refs.current[0]?.focus() }), []);
  const selectedIndex = value ? sizes.indexOf(value) : -1;

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + sizes.length) % sizes.length;
    refs.current[next]?.focus();
    onChange(sizes[next]);
  }

  return (
    <div>
      <p id="pdp-size-label" className="text-sm font-medium text-ink">
        Size
      </p>
      <div
        role="radiogroup"
        aria-labelledby="pdp-size-label"
        aria-describedby={error ? "pdp-size-error" : undefined}
        className="mt-2 flex flex-wrap gap-2"
      >
        {sizes.map((s, i) => {
          const checked = s === value;
          const tabbable = selectedIndex === -1 ? i === 0 : checked;
          return (
            <button
              key={s}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={tabbable ? 0 : -1}
              data-testid={`pdp-size-${s}`}
              onClick={() => onChange(s)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`h-11 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors duration-150 ${
                checked
                  ? "border-ink bg-ink text-canvas shadow-sm"
                  : `${error ? "border-error" : "border-line-strong"} bg-surface text-ink hover:border-ink`
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {error && <FieldError id="pdp-size-error">{error}</FieldError>}
    </div>
  );
});
