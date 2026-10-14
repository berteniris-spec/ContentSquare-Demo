"use client";

import { Price } from "@/components/ui/Price";
import type { ShippingMethod as Method } from "@/lib/pricing";

export function ShippingMethod({
  value,
  standardPrice,
  expressPrice,
  onChange,
}: {
  value: Method;
  standardPrice: number;
  expressPrice: number;
  onChange: (m: Method) => void;
}) {
  const options: { id: Method; name: string; eta: string; price: number }[] = [
    { id: "standard", name: "Standard", eta: "2-4 working days", price: standardPrice },
    { id: "express", name: "Express", eta: "Next working day", price: expressPrice },
  ];
  return (
    <fieldset>
      <legend className="text-xl font-semibold text-ink">Shipping method</legend>
      <div className="mt-4 space-y-3">
        {options.map((o) => {
          const checked = value === o.id;
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors duration-150 ${
                checked ? "border-accent bg-accent-soft" : "border-line-strong bg-surface"
              }`}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={o.id}
                checked={checked}
                onChange={() => onChange(o.id)}
                data-testid={`shipping-${o.id}`}
                className="mt-0.5 size-5 accent-accent"
              />
              <span className="flex-1">
                <span className="flex justify-between gap-3">
                  <span className="font-medium text-ink">{o.name}</span>
                  {o.price === 0 ? (
                    <span className="text-success">Free</span>
                  ) : (
                    <Price amount={o.price} className="text-ink" />
                  )}
                </span>
                <span className="block text-sm text-muted">{o.eta}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
