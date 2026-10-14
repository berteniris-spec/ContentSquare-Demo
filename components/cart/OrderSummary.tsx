"use client";

import { ButtonLink } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/icons";
import type { Totals } from "@/lib/pricing";
import { FreeShippingHint } from "./FreeShippingHint";
import { PromoCode, type PromoVariant } from "./PromoCode";
import { SummaryRows, type ShippingDisplay } from "./SummaryRows";

/**
 * Cart summary panel. Props are the M4 friction hooks:
 * - promoVariant "prominent" puts the open promo block above the rows (promoField);
 * - shippingDisplay "deferred" hides the shipping cost until checkout (shippingSurprise).
 */
export function OrderSummary({
  totals,
  promoCode,
  promoVariant = "collapsed",
  shippingDisplay = "amount",
}: {
  totals: Totals;
  promoCode: string | null;
  promoVariant?: PromoVariant;
  shippingDisplay?: ShippingDisplay;
}) {
  return (
    <section aria-labelledby="summary-heading" className="rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-24">
      <h2 id="summary-heading" className="mb-4 text-xl font-semibold">
        Order summary
      </h2>
      {promoVariant === "prominent" && (
        <div className="mb-6">
          <PromoCode variant="prominent" />
        </div>
      )}
      <SummaryRows totals={totals} promoCode={promoCode} testIdPrefix="cart" shippingDisplay={shippingDisplay} />
      {shippingDisplay === "amount" && <FreeShippingHint discountedSubtotal={totals.subtotal - totals.discount} />}
      <ButtonLink href="/checkout" data-testid="proceed-to-checkout" className="mt-6 w-full">
        Proceed to checkout
      </ButtonLink>
      <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
        <LockIcon size={16} />
        Secure checkout · 30-day returns
      </p>
      {promoVariant === "collapsed" && (
        <div className="mt-4 border-t border-line pt-3">
          <PromoCode variant="collapsed" />
        </div>
      )}
    </section>
  );
}
