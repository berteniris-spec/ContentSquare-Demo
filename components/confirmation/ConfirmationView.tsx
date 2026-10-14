"use client";

import { useSyncExternalStore } from "react";
import { SummaryRows } from "@/components/cart/SummaryRows";
import { SummaryLines } from "@/components/checkout/CheckoutSummary";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { getLastOrderSnapshot, subscribeLastOrder } from "@/lib/order";

const noopSubscribe = () => () => {};

export function ConfirmationView() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const order = useSyncExternalStore(subscribeLastOrder, getLastOrderSnapshot, () => null);

  if (!hydrated) return <div className="min-h-64" aria-hidden="true" />;

  if (!order) {
    return (
      <div data-testid="confirmation-no-order" className="max-w-prose">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">No recent order</h1>
        <p className="mt-4 text-base text-ink-2">
          We couldn’t find an order from this browser session. Your cart and new finds are a click away.
        </p>
        <ButtonLink href="/category/all" className="mt-8 w-full sm:w-auto">
          Shop all products
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
      <div className="lg:col-span-7">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckIcon size={18} />
          Order confirmed
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Thank you for your order</h1>
        <p className="mt-4 max-w-prose text-base text-ink-2">
          Your order number is{" "}
          <span data-testid="confirmation-order-number" className="font-medium tracking-wide text-ink tabular-nums">
            {order.orderNumber}
          </span>
          . We’ll send updates to <span className="font-medium text-ink">{order.email}</span>.
        </p>
        <p className="mt-2 text-sm text-muted">This is a demo store: nothing will be shipped and no payment was taken.</p>
        <ButtonLink href="/" data-testid="continue-shopping" className="mt-8 w-full sm:w-auto">
          Continue shopping
        </ButtonLink>
      </div>
      <section
        data-testid="confirmation-summary"
        aria-labelledby="confirmation-summary-heading"
        className="mt-10 rounded-lg border border-line bg-surface p-6 lg:col-span-5 lg:mt-0"
      >
        <h2 id="confirmation-summary-heading" className="mb-4 text-xl font-semibold">
          Order summary
        </h2>
        <SummaryLines items={order.items} />
        <p className="mb-4 text-sm text-ink-2">
          Shipping method:{" "}
          <span className="font-medium text-ink">
            {order.shippingMethod === "express" ? "Express (next working day)" : "Standard (2-4 working days)"}
          </span>
        </p>
        <SummaryRows
          totals={{ subtotal: order.subtotal, discount: order.discount, shipping: order.shipping, total: order.total }}
          promoCode={order.promoCode}
          testIdPrefix="confirmation"
        />
      </section>
    </div>
  );
}
