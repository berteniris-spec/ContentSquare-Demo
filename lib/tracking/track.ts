// dataLayer helper. Pushes plain { event, ...data } objects onto the shared window.dataLayer.
import { ensureGtag, sendGaEvent } from "./ga";
import { getById, type Product } from "@/lib/products";
import type { CartItem } from "@/lib/cart/store";
import type { Order } from "@/lib/order";

/** Only these business events are forwarded to Google Analytics (GA4 recommended names). */
const GA_FORWARDED = new Set(["view_item", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase"]);

export function track(event: string, data: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  // Makes sure `js` and `config` precede any event in the shared queue.
  ensureGtag();
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
  if (GA_FORWARDED.has(event)) sendGaEvent(event, data.ecommerce);
}

export const CURRENCY = "EUR" as const;

export interface GaItem {
  item_id: string;
  item_name: string;
  item_category: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

const variant = (colour: string, size?: string) => [colour, size].filter(Boolean).join(" / ") || undefined;

export function itemFromProduct(product: Product, colour: string | undefined, size: string | undefined, quantity: number): GaItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    ...(colour ? { item_variant: variant(colour, size) } : {}),
    price: product.price,
    quantity,
  };
}

export function itemFromCart(item: CartItem, quantity = item.quantity): GaItem {
  return {
    item_id: item.productId,
    item_name: item.name,
    item_category: getById(item.productId)?.category ?? "unknown",
    item_variant: variant(item.colour, item.size),
    price: item.unitPrice,
    quantity,
  };
}

const money = (n: number) => Math.round(n * 100) / 100;

export function trackViewItem(product: Product): void {
  track("view_item", {
    ecommerce: { currency: CURRENCY, value: money(product.price), items: [itemFromProduct(product, undefined, undefined, 1)] },
  });
}

export function trackAddToCart(product: Product, colour: string, size: string | undefined, quantity: number): void {
  track("add_to_cart", {
    ecommerce: {
      currency: CURRENCY,
      value: money(product.price * quantity),
      items: [itemFromProduct(product, colour, size, quantity)],
    },
  });
}

export function trackRemoveFromCart(item: CartItem): void {
  track("remove_from_cart", {
    ecommerce: { currency: CURRENCY, value: money(item.unitPrice * item.quantity), items: [itemFromCart(item)] },
  });
}

export function trackBeginCheckout(items: CartItem[], value: number, coupon: string | null): void {
  track("begin_checkout", {
    ecommerce: {
      currency: CURRENCY,
      value: money(value),
      ...(coupon ? { coupon } : {}),
      items: items.map((i) => itemFromCart(i)),
    },
  });
}

/** No email or other PII: only transaction_id, amounts, coupon and items. */
export function trackPurchase(order: Order): void {
  track("purchase", {
    ecommerce: {
      transaction_id: order.orderNumber,
      value: money(order.total),
      currency: CURRENCY,
      shipping: money(order.shipping),
      discount: money(order.discount),
      ...(order.promoCode ? { coupon: order.promoCode } : {}),
      items: order.items.map((i) => itemFromCart(i)),
    },
  });
}
