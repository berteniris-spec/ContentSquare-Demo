// Tiny sRGB colour helpers for the product illustrations (DESIGN_TOKENS.md section 9).

type RGB = [number, number, number];

function parse(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Mix toward black by `amount` (0..1). */
export function darken(hex: string, amount: number): string {
  return toHex(parse(hex).map((v) => v * (1 - amount)) as RGB);
}

/** Mix toward white by `amount` (0..1). */
export function lighten(hex: string, amount: number): string {
  return toHex(parse(hex).map((v) => v + (255 - v) * amount) as RGB);
}

/** WCAG relative luminance (0..1). */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface Palette {
  base: string;
  shade: string;
  light: string;
  line: string;
  hw: string;
  /** Outline for light bases (luminance > 0.6), otherwise undefined. */
  outline?: string;
}

export function paletteFor(base: string): Palette {
  const lum = luminance(base);
  return {
    base,
    shade: darken(base, 0.18),
    light: lighten(base, 0.12),
    line: lum < 0.06 ? lighten(base, 0.2) : darken(base, 0.35),
    hw: lum > 0.25 ? "#2B2925" : "#C9C2B7",
    outline: lum > 0.6 ? darken(base, 0.28) : undefined,
  };
}
