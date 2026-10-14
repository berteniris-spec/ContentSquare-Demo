import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import { awayFromFreeShipping } from "@/lib/pricing";

/** "You're €X away from free shipping" with a progress bar (clean shipping display only). */
export function FreeShippingHint({ discountedSubtotal }: { discountedSubtotal: number }) {
  const away = awayFromFreeShipping(discountedSubtotal);
  if (away <= 0) return null;
  const pct = Math.min(100, Math.round((discountedSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  return (
    <div className="mt-4" data-testid="cart-free-shipping-hint">
      <p className="text-sm text-ink-2">You’re {formatPrice(away)} away from free shipping</p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={FREE_SHIPPING_THRESHOLD}
        aria-valuenow={Math.round(discountedSubtotal * 100) / 100}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
