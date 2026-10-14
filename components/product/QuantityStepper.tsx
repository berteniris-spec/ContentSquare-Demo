"use client";

import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { MAX_QTY } from "@/lib/config";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QTY,
  testIdPrefix = "pdp-qty",
  size = "md",
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  testIdPrefix?: string;
  size?: "md" | "sm";
  label?: string;
}) {
  const btn =
    "grid size-11 place-items-center text-ink hover:bg-sunken disabled:text-line-strong disabled:hover:bg-transparent disabled:cursor-not-allowed";
  return (
    <div
      role="group"
      aria-label={label ?? "Quantity"}
      className={`inline-flex items-center rounded-md border border-line-strong bg-surface ${size === "md" ? "h-12" : "h-11"}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        data-testid={`${testIdPrefix}-dec`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={`${btn} rounded-l-md`}
      >
        <MinusIcon size={18} />
      </button>
      <span data-testid={`${testIdPrefix}-value`} aria-live="polite" className="w-10 text-center font-medium tabular-nums text-ink">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        data-testid={`${testIdPrefix}-inc`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={`${btn} rounded-r-md`}
      >
        <PlusIcon size={18} />
      </button>
    </div>
  );
}
