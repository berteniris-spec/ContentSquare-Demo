"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ProductImage } from "@/components/product/svg/ProductImage";
import { buttonClasses } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { Price } from "@/components/ui/Price";
import { useCart, useCartUi } from "@/lib/cart/CartProvider";
import { getById } from "@/lib/products";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function MiniCartDrawer() {
  const { drawerOpen, drawerReason, closeDrawer, returnFocusRef } = useCartUi();
  if (!drawerOpen) return null;
  return <DrawerPanel reason={drawerReason} onClose={closeDrawer} returnFocusRef={returnFocusRef} />;
}

function DrawerPanel({
  reason,
  onClose,
  returnFocusRef,
}: {
  reason: "added" | "view";
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const { items, subtotal } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnTo = returnFocusRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (returnTo && returnTo.isConnected) returnTo.focus();
    };
  }, [onClose, returnFocusRef]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mini-cart-title"
        data-testid="mini-cart"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-drawer motion-safe:animate-drawer-in"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <h2 id="mini-cart-title" className="text-xl font-semibold text-ink">
            {reason === "added" ? "Added to cart" : "Your cart"}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            data-testid="mini-cart-close"
            className="-mr-2.5 grid size-11 place-items-center rounded-md text-ink transition-colors duration-150 hover:bg-sunken"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-base text-ink-2">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const product = getById(item.productId);
                const colour = product?.colours.find((c) => c.slug === item.colour);
                return (
                  <li key={item.key} className="flex gap-4 py-4 first:pt-0">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-image">
                      {product && <ProductImage product={product} colour={item.colour} decorative />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{item.name}</p>
                      <p className="text-sm text-muted">
                        {[colour?.name ?? item.colour, item.size].filter(Boolean).join(" / ")}
                      </p>
                      <p className="mt-1 text-sm text-ink-2 tabular-nums">
                        {item.quantity} × <Price amount={item.unitPrice} />
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-line p-5">
          <div className="flex justify-between text-base font-medium text-ink">
            <span>Subtotal</span>
            <Price amount={subtotal} />
          </div>
          <p className="text-sm text-muted">Free standard shipping over €75</p>
          <Link
            href="/cart"
            data-testid="mini-cart-view-cart"
            onClick={onClose}
            className={buttonClasses({ variant: "secondary", size: "sm", className: "w-full" })}
          >
            View cart
          </Link>
          <Link
            href="/checkout"
            data-testid="mini-cart-checkout"
            onClick={onClose}
            className={buttonClasses({ variant: "primary", size: "sm", className: "w-full" })}
          >
            Checkout
          </Link>
        </div>
      </div>
    </>
  );
}
