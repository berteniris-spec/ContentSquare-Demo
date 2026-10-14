"use client";

import { Select } from "@/components/ui/Select";
import type { SortKey } from "@/lib/products";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function SortSelect({
  value,
  onChange,
  disabled,
}: {
  value: SortKey;
  onChange?: (value: SortKey) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="plp-sort" className="text-sm font-medium text-ink">
        Sort by
      </label>
      <Select
        id="plp-sort"
        data-testid="plp-sort"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value as SortKey)}
        className="w-56"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
