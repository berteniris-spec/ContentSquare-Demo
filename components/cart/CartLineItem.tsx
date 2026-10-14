"use client";

import Link from "next/link";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { ProductImage } from "@/components/product/svg/ProductImage";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import type { CartItem } from "@/lib/cart/CartProvider";
import { lineTotal } from "@/lib/pricing";
import { getById } from "@/lib/products";

export function CartLineItem({
  item,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  onQuantity: (n: number) => void;
  onRemove: () => void;
}) {
  const product = getById(item.productId);
  const colour = product?.colours.find((c) => c.slug === item.colour);
  const variant = [colour?.name ?? item.colour, item.size].filter(Boolean).join(" / ");
  const href = `/product/${item.slug}`;

  return (
    <li data-testid={`cart-line-${item.key}`} className="flex gap-4 border-b border-line py-6 first:pt-0 sm:gap-6">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="h-30 w-24 shrink-0 overflow-hidden rounded-lg bg-image">
        {product && <ProductImage product={product} colour={item.colour} decorative />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <Link href={href} className="text-base font-medium text-ink underline-offset-4 hover:underline">
              {item.name}
            </Link>
            <p className="text-sm text-muted">{variant}</p>
            <p className="text-sm text-ink-2">
              <Price amount={item.unitPrice} />
            </p>
          </div>
          <Price amount={lineTotal(item)} data-testid="cart-line-total" className="font-medium text-ink" />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
          <QuantityStepper
            value={item.quantity}
            onChange={onQuantity}
            testIdPrefix="cart-qty"
            size="sm"
            label={`Quantity, ${item.name}, ${variant}`}
          />
          <Button variant="ghost" data-testid="cart-remove" onClick={onRemove} aria-label={`Remove ${item.name}, ${variant}`}>
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
