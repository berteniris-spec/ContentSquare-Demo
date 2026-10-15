"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { useCart, useCartUi } from "@/lib/cart/CartProvider";
import { BURIED_CTA_SLUG, DEAD_SWATCH, SILENT_SIZE_SLUG } from "@/lib/config";
import { useFlag } from "@/lib/flags/FlagsProvider";
import type { Product, ProductView } from "@/lib/products";
import { trackAddToCart, trackViewItem } from "@/lib/tracking/track";
import { ColourSwatches } from "./ColourSwatches";
import { ProductGallery } from "./ProductGallery";
import { ProductStory } from "./ProductStory";
import { QuantityStepper } from "./QuantityStepper";
import { SizeSelector, type SizeSelectorHandle } from "./SizeSelector";

function StockNote({ stock }: { stock: Product["stock"] }) {
  if (stock === "low_stock")
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-warning">
        <span className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium">Low stock</span>
        Only a few left
      </p>
    );
  if (stock === "out_of_stock")
    return (
      <p className="mt-3">
        <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink-2">Sold out</span>
      </p>
    );
  return null;
}

/** PDP top section: gallery (left) and product info with purchase controls (right). */
export function ProductDetail({ product }: { product: Product }) {
  const [colour, setColour] = useState(product.colours[0].slug);
  const [view, setView] = useState<ProductView>(product.views[0]);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const sizeRef = useRef<SizeSelectorHandle>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const { addItem } = useCart();
  const { openDrawer } = useCartUi();
  const soldOut = product.stock === "out_of_stock";
  const buriedFlag = useFlag("buriedCta");
  const deadSwatchFlag = useFlag("deadSwatch");
  const silentSizeFlag = useFlag("silentSize");
  const buried = buriedFlag && product.slug === BURIED_CTA_SLUG;
  const deadColour = deadSwatchFlag && product.slug === DEAD_SWATCH.slug ? DEAD_SWATCH.colour : null;

  const viewTracked = useRef<string | null>(null);
  useEffect(() => {
    if (viewTracked.current === product.slug) return;
    viewTracked.current = product.slug;
    trackViewItem(product);
  }, [product]);

  function onAdd() {
    if (soldOut) return;
    if (product.sizes && !size) {
      // silentSize (friction): no message, no focus move, no event.
      if (silentSizeFlag && product.slug === SILENT_SIZE_SLUG) return;
      setSizeError("Please select a size");
      sizeRef.current?.focusFirst();
      return;
    }
    addItem(product, colour, qty, size ?? undefined);
    trackAddToCart(product, colour, size ?? undefined, qty);
    openDrawer("added", addRef.current);
  }

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-12">
      <div className="lg:sticky lg:top-20 lg:col-span-7 lg:self-start">
        <ProductGallery product={product} colour={colour} view={view} onViewChange={setView} />
      </div>
      <div className="mt-8 lg:col-span-5 lg:mt-0">
        <h1 data-testid="pdp-name" className="text-2xl font-semibold tracking-tight lg:text-3xl">
          {product.name}
        </h1>
        <Price data-testid="pdp-price" amount={product.price} className="mt-2 block text-lg font-medium text-ink" />
        <StockNote stock={product.stock} />
        {buried && <ProductStory product={product} long />}

        <div className="mt-8 space-y-6">
          <ColourSwatches
            colours={product.colours}
            value={colour}
            // deadSwatch (friction): the swatch looks and focuses normally but selecting it does nothing.
            onChange={(slug) => {
              if (slug === deadColour) return;
              setColour(slug);
            }}
          />
          {product.sizes && (
            <SizeSelector
              ref={sizeRef}
              sizes={product.sizes}
              value={size}
              error={sizeError}
              onChange={(s) => {
                setSize(s);
                setSizeError(null);
              }}
            />
          )}
          <div>
            <p className="text-sm font-medium text-ink">Quantity</p>
            <div className="mt-2">
              <QuantityStepper value={qty} onChange={setQty} />
            </div>
          </div>
          <div>
            <Button
              ref={addRef}
              id="add-to-cart"
              data-testid="add-to-cart"
              onClick={onAdd}
              disabled={soldOut}
              aria-describedby={soldOut ? "pdp-sold-out-note" : undefined}
              className="w-full"
            >
              {soldOut ? "Sold out" : "Add to cart"}
            </Button>
            {soldOut && (
              <p id="pdp-sold-out-note" className="mt-2 text-sm text-muted">
                This item is currently sold out.
              </p>
            )}
          </div>
        </div>

        <p className="mt-10 max-w-prose text-base text-ink-2">{product.description}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-base text-ink-2">
          {product.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {!buried && <ProductStory product={product} long={false} />}
      </div>
    </div>
  );
}
