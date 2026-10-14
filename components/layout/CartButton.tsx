"use client";

import Link from "next/link";
import { CartIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart/CartProvider";

/** Header cart control: always a link to /cart (never opens the drawer). */
export function CartButton() {
  const { count, hydrated } = useCart();
  const shown = hydrated ? count : 0;
  return (
    <Link
      href="/cart"
      data-testid="header-cart-button"
      aria-label={shown > 0 ? `Cart, ${shown} ${shown === 1 ? "item" : "items"}` : "Cart, empty"}
      className="relative grid size-11 place-items-center rounded-md text-ink transition-colors duration-150 hover:bg-sunken"
    >
      <CartIcon />
      <span
        data-testid="header-cart-count"
        hidden={shown === 0}
        className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-xs font-medium tabular-nums text-canvas"
      >
        {shown}
      </span>
    </Link>
  );
}
