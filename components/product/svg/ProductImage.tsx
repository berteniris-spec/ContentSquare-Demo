import { useId } from "react";
import type { Product, ProductView } from "@/lib/products";
import { paletteFor } from "./color";
import { SILHOUETTES } from "./silhouettes";

const BACKDROP = "#ECE7DF";
const DETAIL_SCALE = 2.2;

interface ProductImageProps {
  product: Product;
  /** Colour slug; falls back to the product's default (first) colour. */
  colour?: string;
  view?: ProductView;
  className?: string;
  /** Decorative images are hidden from assistive tech (cards, cart lines, thumbnails). */
  decorative?: boolean;
}

export function ProductImage({
  product,
  colour,
  view = "front",
  className,
  decorative = false,
}: ProductImageProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const def = SILHOUETTES[product.silhouette];
  const col = product.colours.find((c) => c.slug === colour) ?? product.colours[0];
  const p = paletteFor(col.hex);
  const isDetail = view === "detail";
  const v = isDetail ? def.front : def[view];

  const body = v.body.map((d, i) => (
    <path
      key={i}
      d={d}
      fill={p.base}
      fillRule="evenodd"
      stroke={p.outline}
      strokeWidth={p.outline ? 1.5 : undefined}
      strokeLinejoin="round"
    />
  ));

  const clipId = `pi-clip-${uid}`;
  const patId = `pi-tex-${uid}`;

  const product_ = (
    <g transform={v.transform}>
      {v.under?.(p)}
      {body}
      {isDetail && (
        <g clipPath={`url(#${clipId})`}>
          <rect x={0} y={0} width={400} height={500} fill={`url(#${patId})`} opacity={0.35} />
        </g>
      )}
      {v.draw(p)}
    </g>
  );

  const a11y = decorative
    ? ({ "aria-hidden": true, focusable: false } as const)
    : ({ role: "img", "aria-label": `${product.name} in ${col.name}, ${view} view` } as const);

  const [fx, fy] = def.detailFocus;

  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...a11y}
    >
      <rect width={400} height={500} fill={BACKDROP} />
      {isDetail ? (
        <>
          <defs>
            <clipPath id={clipId}>
              {v.body.map((d, i) => (
                <path key={i} d={d} clipRule="evenodd" />
              ))}
            </clipPath>
            <pattern id={patId} width={3} height={3} patternUnits="userSpaceOnUse">
              <path d="M0.6 2.4L2.4 0.6" stroke={p.shade} strokeWidth={0.5} strokeLinecap="round" />
            </pattern>
          </defs>
          <g transform={`translate(${200 - DETAIL_SCALE * fx} ${235 - DETAIL_SCALE * fy}) scale(${DETAIL_SCALE})`}>
            {product_}
          </g>
        </>
      ) : (
        <>
          <ellipse cx={200} cy={v.shadow.y ?? 440} rx={v.shadow.rx} ry={12} fill="#1D1B18" opacity={0.08} />
          {product_}
        </>
      )}
    </svg>
  );
}
