// Pure pricing rules (PLAN section 9, Cart). Amounts in EUR, rounded to cents.
import { EXPRESS_SHIPPING, FREE_SHIPPING_THRESHOLD, PROMO, STANDARD_SHIPPING } from "./config";

export type ShippingMethod = "standard" | "express";

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export function roundCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineTotal(line: PricedLine): number {
  return roundCents(line.unitPrice * line.quantity);
}

export function subtotal(lines: PricedLine[]): number {
  return roundCents(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
}

export function isValidPromo(code: string | null | undefined): boolean {
  return (code ?? "").trim().toUpperCase() === PROMO.code;
}

/** 10% of the subtotal when DEMO10 is applied, rounded to cents. */
export function discount(sub: number, promoCode: string | null | undefined): number {
  return isValidPromo(promoCode) ? roundCents(sub * PROMO.rate) : 0;
}

/** Standard is free when (subtotal - discount) >= 75; express is always 12.95. */
export function shipping(discountedSubtotal: number, method: ShippingMethod = "standard"): number {
  if (method === "express") return EXPRESS_SHIPPING;
  return discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

/** Amount still needed for free standard shipping (0 when already free). */
export function awayFromFreeShipping(discountedSubtotal: number): number {
  return Math.max(0, roundCents(FREE_SHIPPING_THRESHOLD - discountedSubtotal));
}

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export function totals(
  lines: PricedLine[],
  promoCode: string | null | undefined,
  method: ShippingMethod = "standard",
): Totals {
  const sub = subtotal(lines);
  const disc = discount(sub, promoCode);
  const ship = lines.length === 0 ? 0 : shipping(sub - disc, method);
  return { subtotal: sub, discount: disc, shipping: ship, total: roundCents(sub - disc + ship) };
}
