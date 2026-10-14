"use client";

import { SummaryRows } from "@/components/cart/SummaryRows";
import { ProductImage } from "@/components/product/svg/ProductImage";
import { Button } from "@/components/ui/Button";
import { LockIcon, SpinnerIcon } from "@/components/ui/icons";
import { Price } from "@/components/ui/Price";
import type { CartItem } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { lineTotal, type Totals } from "@/lib/pricing";
import { getById } from "@/lib/products";

export function SummaryLines({ items }: { items: CartItem[] }) {
  return (
    <ul className="mb-6 space-y-4">
      {items.map((item) => {
        const product = getById(item.productId);
        const colour = product?.colours.find((c) => c.slug === item.colour);
        return (
          <li key={item.key} className="flex gap-3">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-image">
              {product && <ProductImage product={product} colour={item.colour} decorative />}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">{item.name}</p>
              <p className="text-muted">{[colour?.name ?? item.colour, item.size].filter(Boolean).join(" / ")}</p>
              <p className="text-ink-2 tabular-nums">Qty {item.quantity}</p>
            </div>
            <Price amount={lineTotal(item)} className="text-sm text-ink" />
          </li>
        );
      })}
    </ul>
  );
}

export function CheckoutSummary({
  items,
  totals,
  promoCode,
  processing,
  formId,
}: {
  items: CartItem[];
  totals: Totals;
  promoCode: string | null;
  processing: boolean;
  formId: string;
}) {
  return (
    <section aria-labelledby="checkout-summary-heading" className="rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-24">
      <h2 id="checkout-summary-heading" className="mb-4 text-xl font-semibold">
        Order summary
      </h2>
      <SummaryLines items={items} />
      <SummaryRows totals={totals} promoCode={promoCode} testIdPrefix="checkout-summary" />
      <Button
        type="submit"
        form={formId}
        id="checkout-submit"
        data-testid="checkout-submit"
        disabled={processing}
        aria-busy={processing || undefined}
        className="mt-6 w-full"
      >
        {processing ? (
          <>
            <SpinnerIcon size={16} className="motion-safe:animate-spin" />
            <span data-testid="checkout-processing">Processing…</span>
          </>
        ) : (
          `Pay ${formatPrice(totals.total)}`
        )}
      </Button>
      <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
        <LockIcon size={16} />
        Secure checkout · 30-day returns
      </p>
    </section>
  );
}
