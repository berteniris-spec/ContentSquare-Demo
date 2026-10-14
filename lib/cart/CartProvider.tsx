"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { subtotal as sumSubtotal } from "@/lib/pricing";
import type { Product } from "@/lib/products";
import {
  dispatch,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type CartItem,
  type CartState,
} from "./store";

export type { CartItem, CartState } from "./store";

type DrawerReason = "added" | "view";

interface CartContextValue {
  /** Opens the mini-cart; focus returns to `returnFocusTo` on close. */
  openDrawer: (reason: DrawerReason, returnFocusTo?: HTMLElement | null) => void;
  closeDrawer: () => void;
  drawerOpen: boolean;
  drawerReason: DrawerReason;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

const CartContext = createContext<CartContextValue | null>(null);

const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The drawer is open only on the path it was opened on: any navigation closes it.
  const [drawer, setDrawer] = useState<{ path: string; reason: DrawerReason } | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openDrawer = useCallback(
    (reason: DrawerReason, returnFocusTo?: HTMLElement | null) => {
      returnFocusRef.current = returnFocusTo ?? null;
      setDrawer({ path: pathname, reason });
    },
    [pathname],
  );
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const value = useMemo<CartContextValue>(
    () => ({
      openDrawer,
      closeDrawer,
      drawerOpen: drawer?.path === pathname,
      drawerReason: drawer?.reason ?? "view",
      returnFocusRef,
    }),
    [openDrawer, closeDrawer, drawer, pathname],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartUi(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartUi must be used inside CartProvider");
  return ctx;
}

/** Cart contents and actions. Safe outside the provider (state lives in the store). */
export function useCart() {
  const state: CartState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return useMemo(() => {
    const count = state.items.reduce((n, i) => n + i.quantity, 0);
    return {
      items: state.items,
      promoCode: state.promoCode,
      count,
      subtotal: sumSubtotal(state.items),
      hydrated,
      addItem: (product: Product, colour: string, quantity: number, size?: string) =>
        dispatch({
          type: "add",
          item: {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            colour,
            size,
            unitPrice: product.price,
            quantity,
          },
        }),
      setQuantity: (key: string, quantity: number) => dispatch({ type: "setQuantity", key, quantity }),
      removeItem: (key: string) => dispatch({ type: "remove", key }),
      applyPromo: () => dispatch({ type: "applyPromo" }),
      removePromo: () => dispatch({ type: "removePromo" }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state, hydrated]);
}

export type CartLine = CartItem;
