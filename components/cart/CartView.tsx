"use client";

import { useCart } from "@/lib/cart/CartProvider";
import { useFlag } from "@/lib/flags/FlagsProvider";
import { totals as computeTotals } from "@/lib/pricing";
import { trackRemoveFromCart } from "@/lib/tracking/track";
import { CartLineItem } from "./CartLineItem";
import { EmptyCart } from "./EmptyCart";
import { OrderSummary } from "./OrderSummary";

export function CartView() {
  const cart = useCart();
  const promoField = useFlag("promoField");
  const shippingSurprise = useFlag("shippingSurprise");
  // Before hydration the store snapshot is empty; render nothing rather than a false "empty" state.
  if (!cart.hydrated) return <div className="min-h-64" aria-hidden="true" />;
  if (cart.items.length === 0) return <EmptyCart />;

  const totals = computeTotals(cart.items, cart.promoCode, "standard");

  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
      <div className="lg:col-span-7">
        <h2 className="sr-only">Items in your cart</h2>
        <ul>
          {cart.items.map((item) => (
            <CartLineItem
              key={item.key}
              item={item}
              onQuantity={(n) => cart.setQuantity(item.key, n)}
              onRemove={() => {
                trackRemoveFromCart(item);
                cart.removeItem(item.key);
              }}
            />
          ))}
        </ul>
      </div>
      <div className="mt-10 lg:col-span-5 lg:mt-0">
        <OrderSummary
          totals={totals}
          promoCode={cart.promoCode}
          promoVariant={promoField ? "prominent" : "collapsed"}
          shippingDisplay={shippingSurprise ? "deferred" : "amount"}
        />
      </div>
    </div>
  );
}
