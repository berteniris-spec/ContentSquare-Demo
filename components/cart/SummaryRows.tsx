import { Price } from "@/components/ui/Price";
import { PROMO } from "@/lib/config";
import type { Totals } from "@/lib/pricing";

export type ShippingDisplay = "amount" | "deferred";

/**
 * Subtotal / discount / shipping / total rows shared by cart and checkout.
 * `shippingDisplay="deferred"` is the M4 shippingSurprise hook ("Calculated at checkout").
 */
export function SummaryRows({
  totals,
  promoCode,
  testIdPrefix,
  shippingDisplay = "amount",
}: {
  totals: Totals;
  promoCode: string | null;
  testIdPrefix: string;
  shippingDisplay?: ShippingDisplay;
}) {
  const deferred = shippingDisplay === "deferred" && totals.shipping > 0;
  const total = deferred ? totals.total - totals.shipping : totals.total;
  return (
    <dl className="space-y-3">
      <div className="flex justify-between text-base">
        <dt className="text-ink-2">Subtotal</dt>
        <dd className="text-ink">
          <Price amount={totals.subtotal} data-testid={`${testIdPrefix}-subtotal`} />
        </dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-base">
          <dt className="text-ink-2">
            {promoCode ?? PROMO.code} (-{Math.round(PROMO.rate * 100)}%)
          </dt>
          <dd className="text-success tabular-nums" data-testid={`${testIdPrefix}-discount`}>
            −<Price amount={totals.discount} />
          </dd>
        </div>
      )}
      <div className="flex justify-between text-base">
        <dt className="text-ink-2">Shipping</dt>
        <dd data-testid={`${testIdPrefix}-shipping`}>
          {deferred ? (
            <span className="text-sm text-muted">Calculated at checkout</span>
          ) : totals.shipping === 0 ? (
            <span className="text-success">Free</span>
          ) : (
            <Price amount={totals.shipping} className="text-ink" />
          )}
        </dd>
      </div>
      <div className="my-4 border-t border-line" />
      <div className="flex justify-between text-xl font-semibold text-ink">
        <dt>Total</dt>
        <dd>
          <Price amount={total} data-testid={`${testIdPrefix}-total`} />
        </dd>
      </div>
    </dl>
  );
}
