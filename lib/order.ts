// Order model and the last order in sessionStorage ('tw-last-order'). Never contains card data.
import { ORDER_PREFIX } from "./config";
import type { CartItem } from "./cart/store";
import type { ShippingMethod } from "./pricing";

export interface Order {
  orderNumber: string;
  createdAt: string;
  email: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shippingMethod: ShippingMethod;
  promoCode: string | null;
  currency: "EUR";
  /** Prevents duplicate purchase events on reload (M5). */
  purchaseTracked: boolean;
}

export const LAST_ORDER_KEY = "tw-last-order";

export function generateOrderNumber(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return ORDER_PREFIX + String(n[0] % 1_000_000).padStart(6, "0");
}

export function saveLastOrder(order: Order) {
  try {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignore: storage unavailable
  }
  cached = undefined;
  listeners.forEach((l) => l());
}

let cached: { raw: string | null; order: Order | null } | undefined;
const listeners = new Set<() => void>();

function parse(raw: string | null): Order | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Order;
    return typeof o?.orderNumber === "string" && Array.isArray(o.items) ? o : null;
  } catch {
    return null;
  }
}

/** useSyncExternalStore snapshot: the last order, cached per raw value. */
export function getLastOrderSnapshot(): Order | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(LAST_ORDER_KEY);
  } catch {
    raw = null;
  }
  if (!cached || cached.raw !== raw) cached = { raw, order: parse(raw) };
  return cached.order;
}

export function subscribeLastOrder(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markPurchaseTracked(orderNumber: string) {
  const order = getLastOrderSnapshot();
  if (order && order.orderNumber === orderNumber && !order.purchaseTracked) {
    saveLastOrder({ ...order, purchaseTracked: true });
  }
}
