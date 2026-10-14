# Design tokens and patterns

Owner: designer. Builder: implement exactly; ask before deviating. Last updated: 2026-10-14 (M3 review).

Character: calm, warm-neutral, premium outdoor. One accent colour (deep tide green), lots of whitespace, large product imagery on a warm backdrop, a plain system sans-serif. No gradients on UI chrome, no pure black, no pure-white page background. Every visual here is original. Do not copy layouts, copy, icons or imagery from real stores.

---

## 0. Brand

- **Name: Tidewild** (confirmed). **Tagline: "Made for the long way round."** (confirmed). The name is short, outdoorsy, and does not lean on any existing outdoor brand.
- **Voice:** British English throughout ("colour", "favourite"), matching the data model. Calm and plain, never shouty: no exclamation marks except the newsletter thank-you, no ALL-CAPS sentences. Sentence case for headings and buttons ("Add to cart", not "ADD TO CART").
- **Shopping container word:** "Cart" (not "Bag"; the catalogue sells bags, so "bag" would be ambiguous). Use it in the header label, drawer title ("Your cart"), page title and buttons.
- **Wordmark (`components/layout/Wordmark.tsx`):** text only, `TIDEWILD`, `font-semibold text-lg tracking-[0.2em] text-ink` (that arbitrary tracking is the only one allowed). Put a small tide glyph in front of it: an inline 20x20 SVG with two stacked wave strokes (`stroke="currentColor"`, `stroke-width="1.75"`, round caps, colour `text-accent`), `aria-hidden`. The link's accessible name is "Tidewild home". Footer: the same wordmark plus the tagline under it in `text-sm text-muted`.
- **Order number:** `TW-` + 6 digits, shown in the normal sans with `tabular-nums tracking-wide` (no monospace font).
- **Hero copy suggestion:** eyebrow "Autumn 2026" (`text-sm font-medium text-accent`), H1 "Gear for days that run long.", subcopy "Packs, layers and small essentials made to last, and to be repaired when they don't.", CTA "Shop all products". The Builder may adjust it. Keep it to one H1 and one sentence of subcopy.

---

## 1. Colour

Light theme only. Set `color-scheme: light` on `html`. **Delete the `prefers-color-scheme: dark` block that create-next-app puts in `globals.css`.**

| Token (Tailwind name) | Hex | Use |
|---|---|---|
| `canvas` | `#FAF8F5` | Page background (`body`) |
| `surface` | `#FFFFFF` | Cards that need lift, inputs, drawer, summary panels |
| `sunken` | `#F2EEE8` | Footer, quiet panels, the demo banner, disabled fills |
| `image` | `#ECE7DF` | Backdrop behind every product illustration |
| `line` | `#E4DFD7` | Dividers and card borders (decorative only) |
| `line-strong` | `#8C857A` | Input, select, checkbox and secondary button borders; switch OFF track |
| `ink` | `#1D1B18` | Primary text, headings, icons |
| `ink-2` | `#4A453E` | Body copy, secondary text |
| `muted` | `#6A645B` | Meta text (colour count, hints, captions, placeholders) |
| `accent` | `#1F5C57` | The one accent: primary buttons, links, selected states, switch ON, focus ring |
| `accent-hover` | `#164642` | Hover/active for accent fills |
| `accent-soft` | `#E2EEEC` | Accent tint backgrounds (selected radio card, promo block, info) |
| `accent-ink` | `#174A46` | Text on `accent-soft` |
| `error` | `#B42318` | Error text, error borders, error icon |
| `error-soft` | `#FDECEA` | Error tint (panel badge "Errors", form error summary) |
| `success` | `#2F6B3B` | Success text (promo applied, "Free", newsletter thanks) |
| `success-soft` | `#E7F2E8` | Success tint |
| `warning` | `#8A5300` | Low-stock text |
| `warning-soft` | `#FBF0DC` | Low-stock badge background |
| `focus` | `#1F5C57` | Focus ring (same as accent) |

### Contrast (WCAG 2.x, computed)

| Foreground | on canvas | on surface | on sunken | on accent-soft | Result |
|---|---|---|---|---|---|
| ink | 16.21 | 17.18 | 14.87 | 14.46 | AAA |
| ink-2 | 8.96 | 9.49 | 8.21 | 7.99 | AAA |
| muted | 5.52 | 5.85 | 5.07 | 4.93 | AA (all text sizes) |
| accent (text/links) | 7.27 | 7.70 | 6.66 | 6.48 | AAA / AA |
| accent-ink | 9.41 | 9.98 | 8.63 | 8.40 | AAA |
| error | 6.20 | 6.57 | 5.69 | - | AA |
| success | 6.03 | 6.39 | 5.53 | - | AA |
| warning | 5.97 | 6.33 | 5.48 | - | AA |
| line-strong (UI borders) | 3.44 | 3.65 | 3.16 | 3.07 | Meets 3:1 non-text |
| line (decorative) | 1.25 | 1.33 | - | - | Decorative only, never the only boundary of a control |

Other pairs: white on `accent` 7.70, white on `accent-hover` 10.56; `error` on `error-soft` 5.75; `success` on `success-soft` 5.56; `warning` on `warning-soft` 5.61; `muted` on `image` 4.76; focus ring (`accent`) against canvas 7.27.

Rules:
- Text on `image` (backdrop) is allowed only in `ink`, `ink-2` or `muted`. Never white text on product imagery or the hero.
- Status is never shown by colour alone. Pair it with text and/or an icon ("Low stock: 2 left", an error icon plus a message).
- Product colours (section 9) are illustration colours, not UI colours.

---

## 2. Typography

**Font: the system UI stack. No web font and no `next/font` at all.** It builds offline, has zero layout shift, and looks native and calm. **Remove the Geist `next/font/google` import and its CSS variables that create-next-app adds to `app/layout.tsx`.**

```
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif
```

On `body`: `font-sans text-base text-ink-2 bg-canvas antialiased`. Prices, quantities, totals and order numbers use `tabular-nums`.

| Token | Size / line height | Weight and tracking | Use |
|---|---|---|---|
| `text-display` | clamp(2.5rem → 4rem) / 1.05 | `font-semibold tracking-tight text-ink` | Hero H1 only |
| `text-4xl` | 2.5rem / 1.1 | `font-semibold tracking-tight` | Page H1 on desktop (PLP title, Cart, Checkout) |
| `text-3xl` | 2rem / 1.15 | `font-semibold tracking-tight` | Page H1 on mobile, PDP product name (desktop) |
| `text-2xl` | 1.5rem / 1.25 | `font-semibold tracking-tight` | Section H2 ("Featured", "You may also like"), PDP name (mobile) |
| `text-xl` | 1.25rem / 1.4 | `font-semibold` | H3, summary total, drawer title |
| `text-lg` | 1.125rem / 1.6 | `font-normal` | Lead paragraphs, hero subcopy, PDP price (`font-medium text-ink`) |
| `text-base` | 1rem / 1.6 | `font-normal` | Body, inputs, buttons, card name (`font-medium text-ink`) |
| `text-sm` | 0.875rem / 1.45 | `font-normal` / `font-medium` | Labels, meta, nav links, badges, errors |
| `text-xs` | 0.75rem / 1.4 | `font-medium tracking-wide` | Rare: badge counts, legal line in footer |

Weights: only 400, 500 (`font-medium`), 600 (`font-semibold`). No bold (700) and no light weights. Long text max width `max-w-prose` (65ch). Inputs are always at least 16px (`text-base`) so iOS does not zoom.

---

## 3. Spacing, layout, breakpoints

- Spacing: Tailwind's default 4px base (`--spacing: 0.25rem`). Use the scale. No arbitrary pixel values.
- Container: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` (max 1280px). Use it for header, main and footer so their edges align.
- Section rhythm: `py-12 md:py-20` between homepage sections; `mt-10 md:mt-16` before related products.
- Stacks: field to field `gap-5`; label to input `gap-1.5`; heading to content `mb-6 md:mb-8`.
- Product grid: `grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6 md:gap-y-12`. Featured/related rows use the same grid with 4 items (2x2 on mobile).
- PDP: `lg:grid lg:grid-cols-12 lg:gap-12`, gallery `lg:col-span-7`, info `lg:col-span-5`. Below `lg` it is a single column.
- Cart and checkout: `lg:grid lg:grid-cols-12 lg:gap-12`, content `lg:col-span-7`, summary `lg:col-span-5`. The summary is `lg:sticky lg:top-24`. On mobile the summary comes after the lines (cart) or after the form, above the Pay button (checkout).
- Breakpoints: **Tailwind v4 defaults, unchanged**: `sm` 40rem (640), `md` 48rem (768), `lg` 64rem (1024), `xl` 80rem (1280). Review widths: 390 and 1280.
- Z-index: header `z-30`, drawer overlay `z-40`, drawer `z-50`, skip link `z-[60]`.
- Touch targets: every interactive element is at least 44x44px (`min-h-11 min-w-11`). For a smaller visual (swatch, icon), pad the hit area.

---

## 4. Radii, shadows, borders, motion

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 0.25rem | Tiny things: checkbox, badge-square |
| `rounded-md` | 0.5rem | Buttons, inputs, selects, banners, size chips |
| `rounded-lg` | 0.75rem | Product image tiles, cards, summary panel |
| `rounded-xl` | 1.25rem | Hero image, category tiles |
| `rounded-full` | 9999px | Swatches, switches, count badge, pills |

Shadows are warm and faint. The layout relies on borders and backgrounds, not elevation.

| Token | Value | Use |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgb(29 27 24 / 0.06)` | Switch thumb, selected size chip |
| `shadow-md` | `0 4px 16px -4px rgb(29 27 24 / 0.10)` | Sticky header after scroll (optional), popovers |
| `shadow-drawer` | `-12px 0 40px -12px rgb(29 27 24 / 0.22)` | Mini-cart drawer |

- Borders: 1px. `border-line` for dividers and cards; `border-line-strong` for control boundaries.
- Motion: `duration-150` for colour/hover changes, `duration-200` for the drawer slide and menu, `ease-out`. Image hover: `transition-transform duration-300 group-hover:scale-[1.02]`. Wrap every non-colour animation in `motion-safe:`; with `prefers-reduced-motion` the drawer just appears.

---

## 5. Focus ring

Global, in `globals.css` (base layer), so no component can forget it:

```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  :focus:not(:focus-visible) { outline: none; }
}
```

- Do not use `outline-none` without a replacement. Inputs: keep the outline and also set `focus-visible:border-accent`.
- Product cards: the `<a>` wraps the whole card, so the ring follows the card (`rounded-lg`, `outline-offset: 4px` via `focus-visible:outline-offset-4`).
- The ring sits outside the element, so it shows on canvas, surface, sunken and around accent buttons (7.27:1). Dark backgrounds are not used anywhere, so one ring colour is enough.
- Skip link: `sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:px-4 focus:py-3 rounded-md bg-surface text-sm font-medium text-ink shadow-md`. The padding must carry the `focus:` prefix, because Tailwind v4's `focus:not-sr-only` resets padding to 0 and wins over unprefixed `px-4 py-3`. Text: "Skip to content". Target: `<main id="main" tabindex="-1">`.

---

## 6. `globals.css` (paste as is)

```css
@import "tailwindcss";

@theme {
  /* Reset Tailwind's default palette so only brand tokens exist */
  --color-*: initial;
  --color-white: #ffffff;
  --color-black: #000000;

  --color-canvas: #faf8f5;
  --color-surface: #ffffff;
  --color-sunken: #f2eee8;
  --color-image: #ece7df;
  --color-line: #e4dfd7;
  --color-line-strong: #8c857a;
  --color-ink: #1d1b18;
  --color-ink-2: #4a453e;
  --color-muted: #6a645b;
  --color-accent: #1f5c57;
  --color-accent-hover: #164642;
  --color-accent-soft: #e2eeec;
  --color-accent-ink: #174a46;
  --color-error: #b42318;
  --color-error-soft: #fdecea;
  --color-success: #2f6b3b;
  --color-success-soft: #e7f2e8;
  --color-warning: #8a5300;
  --color-warning-soft: #fbf0dc;
  --color-focus: #1f5c57;

  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;

  --text-xs: 0.75rem;     --text-xs--line-height: 1.4;
  --text-sm: 0.875rem;    --text-sm--line-height: 1.45;
  --text-base: 1rem;      --text-base--line-height: 1.6;
  --text-lg: 1.125rem;    --text-lg--line-height: 1.6;
  --text-xl: 1.25rem;     --text-xl--line-height: 1.4;
  --text-2xl: 1.5rem;     --text-2xl--line-height: 1.25;
  --text-3xl: 2rem;       --text-3xl--line-height: 1.15;
  --text-4xl: 2.5rem;     --text-4xl--line-height: 1.1;
  --text-display: clamp(2.5rem, 1.6rem + 3.2vw, 4rem);
  --text-display--line-height: 1.05;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1.25rem;

  --shadow-sm: 0 1px 2px rgb(29 27 24 / 0.06);
  --shadow-md: 0 4px 16px -4px rgb(29 27 24 / 0.10);
  --shadow-drawer: -12px 0 40px -12px rgb(29 27 24 / 0.22);
}

@layer base {
  html { color-scheme: light; -webkit-text-size-adjust: 100%; }
  body {
    background-color: var(--color-canvas);
    color: var(--color-ink-2);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4 { color: var(--color-ink); text-wrap: balance; }
  :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
  :focus:not(:focus-visible) { outline: none; }
  ::selection { background: var(--color-accent-soft); color: var(--color-ink); }
}
```

Since the palette is reset, `bg-gray-*`, `text-neutral-*`, `bg-red-*` and the like **do not exist**. Use the tokens only. `bg-transparent`, `bg-current`, `bg-white` and opacity modifiers (`bg-ink/40`) still work.

---

## 7. Component patterns

Write the class strings once in `components/ui/*` and reuse them. Don't scatter variants around the codebase.

### Buttons (`components/ui/Button.tsx`, variants `primary | secondary | ghost`, sizes `md | sm`)
- Base: `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 select-none disabled:cursor-not-allowed`.
- Sizes: `md` = `h-12 px-6 text-base` (main CTAs: Add to cart, Proceed to checkout, Pay, hero CTA); `sm` = `h-11 px-4 text-sm` (Apply, drawer buttons, newsletter).
- `primary`: `bg-accent text-white hover:bg-accent-hover active:bg-accent-hover disabled:bg-sunken disabled:text-muted`.
- `secondary`: `border border-line-strong bg-surface text-ink hover:border-ink hover:bg-sunken disabled:text-muted disabled:border-line`.
- `ghost` (text button: Remove, "Add a promo code", Lock): `h-11 px-2 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline`.
- Full width on mobile for main CTAs: `w-full sm:w-auto`. In the PDP purchase panel, the cart summary and the drawer they are always `w-full`.
- Loading (checkout processing): keep the width, show a 16px spinner (`motion-safe:animate-spin`, stroke `currentColor`) plus "Processing…", set `disabled` and `aria-busy="true"`. **It keeps the primary colours while busy** (it is working, not unavailable): add `aria-busy:bg-accent! aria-busy:text-white! aria-busy:cursor-progress` to the primary variant, so the grey `disabled:` style only applies to buttons that are truly unavailable (such as "Sold out").
- One `primary` per view region. Secondary actions are `secondary` or `ghost`.
- Text links in copy: `text-accent underline underline-offset-4 decoration-1 hover:text-accent-hover`. Nav links: `text-sm font-medium text-ink-2 hover:text-ink`, and the current page gets `text-ink` + `aria-current="page"` + a 2px `accent` underline (`border-b-2 border-accent`).

### Inputs (`components/ui/Field.tsx`: label + control + hint + error)
- Label: `block text-sm font-medium text-ink` above the control. Required fields are not marked with an asterisk; say "All fields are required" once at the top of the form, and mark the one optional field (none in this shop) with "(optional)".
- Control: `h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-muted focus-visible:border-accent`. Never use the placeholder as the label.
- Hint: `text-sm text-muted`, linked with `aria-describedby`.
- Error state: `border-error` + `aria-invalid="true"`; message below: `flex gap-1.5 text-sm text-error` with a 16px error icon (circle-with-exclamation, `aria-hidden`), `id="error-<field>"`, referenced in `aria-describedby`. The message appears on blur/submit, not while the user is typing.
- Select: same as the control plus `appearance-none pr-10` and a 16px chevron icon placed absolutely at `right-3` (`text-muted`, `pointer-events-none`).
- Inline input + button: `flex gap-2`, input `flex-1`. Promo: `sm` secondary button. Newsletter: `md` primary button (matches the h-12 input). Below 360px they stack.
- Checkbox/radio native visuals: `accent-[var(--color-accent)] size-5` is acceptable for the checkbox. Radio cards are below.

### Radio cards (shipping method)
- `flex items-start gap-3 rounded-md border border-line-strong bg-surface p-4 cursor-pointer`. Checked: `border-accent bg-accent-soft` with a visible native radio (`accent-[var(--color-accent)] size-5`). Label row: method name `font-medium text-ink`, price aligned right `tabular-nums text-ink`. Second line: "2-4 working days" / "Next working day" in `text-sm text-muted`.

### Swatches (colour radio group)
- A 44px button-sized hit area containing a 32px circle: `relative grid size-11 place-items-center rounded-full`; inner `size-8 rounded-full ring-1 ring-inset ring-ink/15` filled with the colour hex (inline `style`). The inset ring keeps light colours visible.
- Hover: `hover:ring-2 hover:ring-line-strong` on the outer. Selected: outer `ring-2 ring-ink ring-offset-2 ring-offset-canvas`.
- Above the group: "Colour: **Moss**" (`text-sm text-ink-2`, colour name `font-medium text-ink`).
- Semantics: `role="radiogroup" aria-label="Colour"`, each `role="radio" aria-checked aria-label="Moss"`, roving tabindex, arrow keys move and select.

### Size chips
- `min-w-12 h-11 px-3 rounded-md border border-line-strong bg-surface text-sm font-medium text-ink hover:border-ink`. Selected: `border-ink bg-ink text-canvas shadow-sm` (15.5:1). Unavailable sizes are not modelled; don't style any.
- Layout: `flex flex-wrap gap-2`. Above: "Size" label (`text-sm font-medium text-ink`). No "Size guide" link (it would be a dead link that muddies the heatmaps).
- Clean size error: under the chips, the same error pattern as inputs. While the error shows, unselected chips swap `border-line-strong` for `border-error` (the hover stays `hover:border-ink`). The border clears as soon as a size is picked, together with the message. The whole group gets `aria-describedby="pdp-size-error"`, and focus moves to the first chip.

### Quantity stepper
- `inline-flex h-12 items-center rounded-md border border-line-strong bg-surface`; buttons `size-11 grid place-items-center text-ink hover:bg-sunken disabled:text-line-strong disabled:hover:bg-transparent` with minus/plus icons and `aria-label="Decrease quantity"` / `"Increase quantity"`. Value `w-10 text-center tabular-nums font-medium text-ink`, `aria-live="polite"`. In the cart use `h-11` and the same pattern.

### Product card (`ProductCard.tsx`)
- `<a class="group block rounded-lg focus-visible:outline-offset-4">` wrapping:
  - Image tile: `aspect-[4/5] overflow-hidden rounded-lg bg-image`, illustration inside with `motion-safe:group-hover:scale-[1.02] transition-transform duration-300`.
  - `mt-3` name: `text-base font-medium text-ink group-hover:underline underline-offset-4`.
  - Price: `text-base text-ink tabular-nums`.
  - Meta: `text-sm text-muted` "3 colours".
  - Stock badge (low/out) top-left on the tile: `absolute left-3 top-3`.
- No borders or shadows on cards. Image plus whitespace is enough.
- The card image is `aria-hidden` because the name is the link text.

### Category tile (home)
- `group relative block overflow-hidden rounded-xl bg-image aspect-[4/3] sm:aspect-[4/5] md:aspect-[3/4]` (landscape on mobile, so the 3 stacked tiles don't take 3 screens), illustration centred. Label chip bottom-left: `absolute bottom-4 left-4 rounded-md bg-surface px-4 py-2.5 text-base font-medium text-ink shadow-sm` with an arrow icon. Never put text directly on the illustration.

### Badges / pills
- Base: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium`.
- Low stock: `bg-warning-soft text-warning` "Low stock". On the PDP, add text: "Only a few left".
- Out of stock: `bg-sunken text-ink-2` "Sold out". On the PDP, the Add to cart button is disabled and reads "Sold out", with the explanation "This item is currently sold out." in `text-sm text-muted` below it.
- Cart count (header): `absolute -right-1 -top-1 grid min-w-5 h-5 place-items-center rounded-full bg-ink px-1 text-xs font-medium text-canvas tabular-nums`. Hidden until hydrated and while the count is 0.
- Panel capability badges (internal page): Funnel `bg-accent-soft text-accent-ink`, Heatmaps `bg-warning-soft text-warning`, Session replay `bg-sunken text-ink-2 ring-1 ring-inset ring-line`, Errors `bg-error-soft text-error`. Text is always present, so colour is never the only cue.

### Switch (`components/ui/Switch.tsx`, `role="switch"`, `aria-checked`)
- `<button>` hit area `min-h-11 inline-flex items-center gap-3`. Track `relative h-6 w-11 rounded-full transition-colors duration-150`: OFF `bg-line-strong` (3.65:1 on surface), ON `bg-accent`. Thumb `absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm motion-safe:transition-transform`, ON `translate-x-5`. Disabled: `opacity-50 cursor-not-allowed`.
- Always next to a text state: "On"/"Off" (`text-sm font-medium`, ON `text-accent`, OFF `text-muted`). The accessible name comes from the flag label (`aria-labelledby`).
- Demo panel size (`size="lg"`): track `h-8 w-14`, thumb `size-7`, ON `translate-x-6`. Readable from across a room.

### Mini-cart drawer (`MiniCartDrawer.tsx`)
- Overlay: `fixed inset-0 z-40 bg-ink/40`; clicking it closes the drawer.
- Panel: `fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-drawer`, `role="dialog" aria-modal="true" aria-labelledby="mini-cart-title"`. Slides in from the right with `motion-safe:transition-transform duration-200 ease-out` (`translate-x-full` → `translate-x-0`).
- Header: `flex items-center justify-between border-b border-line px-5 h-16`; title `text-xl font-semibold text-ink` "Added to cart" when opened by an add, otherwise "Your cart"; close button 44px icon button `aria-label="Close cart"`.
- Body (`flex-1 overflow-y-auto px-5 py-4`): line items with a 64x80 image tile (`rounded-md bg-image`), name, variant ("Moss / M") `text-sm text-muted`, qty x price.
- Footer (`border-t border-line p-5 space-y-3`): Subtotal row (`text-base font-medium text-ink`, value `tabular-nums`), then the note "Free standard shipping over €75" in `text-sm text-muted` (neutral and true in both flag states; do not mention "calculated at checkout" here). Then `View cart` (secondary, `w-full`) and `Checkout` (primary, `w-full`).
- Behaviour: focus moves to the close button on open, Tab is trapped, Esc closes it, focus returns to the trigger (Add to cart). Only Add to cart opens the drawer. Lock body scroll while open. The drawer is not rendered (or has `inert`/`hidden`) when closed.

### Header
- Sticky: `sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80`, height `h-16`, inside the container.
- Desktop (`md+`): wordmark left, nav centre-left (`gap-8`): Bags, Apparel, Accessories, All products; cart control right (bag-outline icon 24px + count badge, `aria-label="Cart, 2 items"`; 0 items: "Cart, empty").
- The header cart control is a plain **link to `/cart`** in every milestone, not a drawer trigger. Reason: it gives a real `/cart` page view, which keeps the Contentsquare funnel step clean; the drawer opens only after Add to cart and has its own "View cart" link.
- Mobile (<`md`): menu button left (44px, hamburger/close icon, `aria-expanded`, `aria-controls="mobile-nav"`, label "Menu"), wordmark centred, cart right. The menu opens as a panel directly under the header bar (`border-t border-line bg-canvas`; the header's own `border-b` closes it, so don't add a second bottom border), links stacked `block py-3 text-base font-medium text-ink` (≥ 48px rows). Esc and route change close it. Not a drawer, no overlay.

### Values strip (home)
- Full-bleed band: `section.border-y.border-line.bg-sunken` with `aria-label`. Inside, the container `ul.grid.gap-8.py-12.md:grid-cols-3`. Each item is `flex gap-4`: a 24px icon in `text-accent` (truck, leaf, wrench), then an `h3` in `text-base font-medium text-ink` and one line of `text-sm text-ink-2`. Keep it to 3 items with no links.

### Newsletter (home)
- In the container, `py-12 md:py-20`. Mobile: a single column in `max-w-xl`. From `md` up: `md:grid md:grid-cols-2 md:items-end md:gap-12`, with the heading (`text-2xl`) and one line of copy on the left and the form on the right (label "Email address", then input + **primary** `md` button "Sign up", the same h-12 height as the input; stacked below 360px).
- Thank-you: `role="status"`, `text-sm text-success` with a check icon, "Thanks for signing up!" (the only exclamation mark allowed). Errors use the input error pattern.

### Footer
- `mt-24 border-t border-line bg-sunken`, `py-12`. Grid `md:grid-cols-4 gap-8`: column 1 wordmark + tagline; Shop (the 4 category links); Help (Shipping, Returns, Contact as plain `text-sm text-ink-2` text spans, not links); About (Our materials, Repairs, as plain text). Bottom row `border-t border-line pt-6 text-xs text-muted`: "© 2026 Tidewild. A fictional store built for a product demo."

### Cart line (approved M3)
- `li.flex.gap-4.sm:gap-6.border-b.border-line.py-6.first:pt-0`. Image tile `h-30 w-24 rounded-lg bg-image` (a link, but `tabIndex=-1 aria-hidden`), then the name link (`text-base font-medium text-ink hover:underline`), variant `text-sm text-muted`, unit price `text-sm text-ink-2`. The line total is top-right (`font-medium text-ink tabular-nums`). Bottom row: `sm` quantity stepper plus a ghost "Remove" whose accessible name includes the product and variant.

### Promo (clean, approved M3)
- Below the trust line, after `border-t border-line pt-3`: ghost "Add a promo code" with a plus icon (`aria-expanded`/`aria-controls`) that expands to input + Apply. Applied state: one visible success row (check icon, `text-sm text-success`, "DEMO10 applied: 10% off your order") plus ghost "Remove code". The announcement comes from the polite live region; don't repeat the same fact in two visible lines.

### Summary panel (cart/checkout)
- `rounded-lg bg-surface border border-line p-6`. Rows `flex justify-between text-base` (label `text-ink-2`, value `text-ink tabular-nums`). Discount value in `text-success` prefixed with "−". Divider `border-t border-line my-4`. Total row `text-xl font-semibold text-ink`. CTA below at `mt-6`. Trust line under the CTA: lock icon + "Secure checkout · 30-day returns" in `text-sm text-muted`.

### Banners
- Demo banner (checkout): `flex gap-3 rounded-md bg-sunken border border-line px-4 py-3 text-sm text-ink-2` with a 20px info icon `text-accent`. Calm and informative, never red. Exact text from PLAN section 9.
- Inline success (promo applied, newsletter thanks): `text-sm text-success` with a check icon. Error: the error pattern.

### Icons
- Draw them in-house as inline SVG: 24px grid, `fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`, `aria-hidden="true"`. Set needed: menu, close, cart (bag outline), arrow-right, chevron-down, minus, plus, check, info, alert-circle, lock, truck, leaf, wrench (values strip). No icon libraries.

### 404
- Centred in the shop layout, `py-24`: eyebrow `text-sm font-medium text-accent` "404", H1 `text-3xl` "This trail doesn't go anywhere", one line of body, buttons "Back to home" (primary) and "Shop all products" (secondary).

---

## 8. Imagery: hero

- `public/images/hero.svg`: an original abstract coastal landscape in flat layers. Bands use `#ECE7DF` sky, `#D9CFBF` far dunes, `#9DB3AC` sea, `#5E7F78` mid tide, `#1F5C57` foreground hill, with a pale sun disc `#F4EBDD`. Add 2-3 thin wave lines in `#FAF8F5` at 60% opacity. No text in the image. ViewBox `0 0 1200 960` (5:4). Keep it small (< 15 KB).
- `/api/hero-image` (slowHero ON) must show **the same composition** with many extra detail paths (grain, hundreds of tiny wave strokes) to bulk it up, so the only visible difference is load time, not the art.
- Container: `aspect-[5/4] overflow-hidden rounded-xl bg-image` with the image `w-full h-full object-cover`, plus explicit `width`/`height` attributes. Alt: `""`. The hero image is decorative; the H1 carries the meaning.
- Layout: `lg:grid lg:grid-cols-2 lg:items-center lg:gap-12`, text first on mobile, image below the text.

---

## 9. Imagery: SVG product illustrations

One renderer `ProductImage({ product, colour, view, className, decorative })`. Shapes live in `silhouettes.tsx`, one entry per `Silhouette`, each exporting a function per view.

### Canvas and style
- `viewBox="0 0 400 500"` (4:5, same as the card tile), `preserveAspectRatio="xMidYMid meet"`, `width="100%" height="100%"`. Background rect `#ECE7DF` (the `image` token) so the SVG works on its own too.
- Flat, modern, slightly geometric product drawings, like a catalogue line drawing filled with flat colour. No outlines on the body except as noted below, no gradients except one soft shading layer, no photorealism, no text or logos on the products (a small abstract tide-glyph label patch in a neutral tone is allowed).
- Composition: the product is centred, occupying about 60-72% of the width, with its visual centre near `(200, 235)`. Ground shadow: `<ellipse cx="200" cy="440" rx="120" ry="12" fill="#1D1B18" opacity="0.08">`, scaled to the product width.
- Layers, in order:
  1. **Body**: main shapes filled with `base` = colour hex.
  2. **Shade**: one or two shapes (side panel, underside, inner fold) in `shade` = darken(base, 18%).
  3. **Highlight**: one shape (top edge, upper-left panel) in `light` = lighten(base, 12%) at `opacity 0.6`.
  4. **Details**: seams, zips, straps, pocket edges, ribbing as strokes in `line` = darken(base, 35%), `stroke-width 2` (seams `1.5` with `stroke-dasharray="4 4"`), `stroke-linecap/linejoin="round"`, `fill="none"`.
  5. **Hardware**: zip pulls, buckles, clips, bottle cap. `#2B2925` if base luminance > 0.25, else `#C9C2B7`. This stays the same across colour variants, like real hardware.
- Light colours: if the relative luminance of base is > 0.6 (e.g. oat, chalk, sand), add `stroke={darken(base, 28%)} stroke-width="1.5"` to the outer body shapes so they don't vanish into the `#ECE7DF` backdrop (measured: chalk vs backdrop 1.06:1).
- Implement `darken/lighten/luminance` as tiny pure functions in `components/product/svg/color.ts` (mix toward `#000`/`#fff` in sRGB). Do not use CSS `color-mix` inside SVG attributes.
- IDs: any `<pattern>`, `<clipPath>` or `<mask>` id must be made unique with React `useId()`, because many images share a page. Prefer no defs at all.

### Colour variants
- Only `base` changes per colour. Shapes, hardware and backdrop stay fixed, so switching swatches looks like the same product dyed differently.
- Recommended product colour set (use these names/hexes in `lib/products.ts`; others are fine if they sit in this muted family):

| Name | slug | hex | | Name | slug | hex |
|---|---|---|---|---|---|---|
| Moss | `moss` | `#5E6B3F` | | Sea | `sea` | `#3F6F73` |
| Forest | `forest` | `#2F4A3A` | | Slate | `slate` | `#5F6E78` |
| Sand | `sand` | `#CDB892` | | Navy | `navy` | `#263449` |
| Oat | `oat` | `#E4D9C4` | | Charcoal | `charcoal` | `#34363A` |
| Clay | `clay` | `#B9876A` | | Ochre | `ochre` | `#C08A2B` |
| Rust | `rust` | `#A4502E` | | Berry | `berry` | `#7A3B4E` |
| Stone | `stone` | `#9A948A` | | Chalk | `chalk` | `#F1EEE7` |

- No pure black or saturated primaries. The first colour in each product's list is its default (cards, related, cart line).
- `field-tote` must include `moss` (deadSwatch target) as a non-first colour, so the default image is not moss.

### The 4 views
All views use the same canvas, backdrop and ground shadow, so thumbnails line up.
- **front**: the full product, straight on, with all front details (pockets, zips, logo patch).
- **back**: the same outline mirrored or adjusted with back details: straps and back panel for bags, plain back with yoke seam for apparel, the reverse for accessories. The back is drawn, not just a mirrored front.
- **side**: a narrower profile (about 40-55% of the front width). Show depth: bag gusset, side bottle pocket, hood profile, cap brim. Use its own path rather than `scaleX`, unless the product is truly symmetric (bottle, beanie), where a squash is acceptable.
- **detail**: a close-up crop. Render the front drawing inside `<g transform="translate(...) scale(2.2)">` aimed at a per-silhouette `detailFocus` point (zip pull, buckle, cuff, label patch), plus a subtle fabric texture: a pattern of short diagonal strokes in `shade` at `opacity 0.35`, clipped to the body shapes. The ground shadow is omitted in this view.
- Products with 3 views drop `detail` or `side`. Thumbnails show only `product.views`.
- Two products that share a silhouette must still look like different products in the grid. Give the second one its own proportions or details (see the M1 review: `slim-card-wallet` vs `travel-wallet`, `daypack-18` vs `trailhead-28-backpack`).

### Accessibility of images
- Decorative contexts (product card, related, cart line, drawer line, category tile): `aria-hidden="true"`, `focusable="false"`.
- PDP main image: `role="img" aria-label="{name} in {colour name}, {view} view"`.
- PDP thumbnails are `<button aria-label="Show {view} view" aria-pressed>` containing a decorative SVG. Thumbnail tile `h-25 w-20 overflow-hidden rounded-md bg-image ring-1 ring-line hover:ring-line-strong` (80x100, 4:5, so the art is not letterboxed), active `ring-2 ring-ink`.
- PDP gallery column: `lg:sticky lg:top-20 lg:self-start` on the `lg:col-span-7` wrapper, so the image stays in view beside long info/story text. On short viewports only the empty bottom edge of the backdrop is cropped while it is stuck, which is acceptable. Below `lg` it is not sticky.
- PDP gallery layout: below `lg`, the thumbnails sit in a row under the main image (`mt-4 flex flex-wrap gap-3`). From `lg` up they form a vertical rail on the left, so they are visible above the fold at 1280x800. Wrapper `lg:flex lg:flex-row-reverse lg:items-start lg:gap-4`, main image `lg:flex-1 lg:min-w-0`, thumbnail list `lg:mt-0 lg:flex-col lg:flex-nowrap`. The DOM order stays main image first, then thumbnails.

### Quality bar (designer review checks this for all 24)
- Each silhouette is recognisable at 160px wide (card on mobile), with no clipping at the tile edges. Exception (approved in the M1 re-review): a thin carry strap, such as the city sling's crossbody strap, may run off the tile edges. The product body, handles and hardware must stay fully inside the tile.
- Consistent scale within a category: a backpack is not drawn smaller than a key clip.
- Every colour variant reads well. Light variants have the outline; dark variants keep visible detail strokes (the 35% darken holds up on charcoal; if not, use lighten(base, 20%) for detail lines when luminance < 0.06).

---

## 10. Friction ON states: how they should look

The principle: **each ON state must look like a deliberate, slightly over-eager product decision by a real e-commerce team, never like a bug or a broken page.** Use the same tokens and components as the clean state. Never add debug labels, red outlines, "demo" hints or console-only styling to the shop UI. OFF leaves no wrapper, spacer or empty element behind.

| Flag | ON look | OFF look |
|---|---|---|
| `promoField` | In the summary, **above** the subtotal: `rounded-lg bg-accent-soft p-5` block, heading "Have a promo code?" (`text-base font-semibold text-accent-ink`), line "Unlock extra savings on your order." (`text-sm text-ink-2`), then input + Apply (`sm` secondary) always visible. It looks like a confident marketing slot and pulls the eye, but "Proceed to checkout" stays the only primary button. No animation, no sparkle icons. | After the total and the Proceed button: ghost button "Add a promo code" with a plus icon (`aria-expanded`), expanding in place to the same input + Apply. Quiet. |
| `shippingSurprise` | Shipping row value "Calculated at checkout" in `text-sm text-muted` (same row layout). Total row labelled "Total" and excludes shipping. Over the threshold the row shows "Free". No hint, no progress bar. Must look like a normal pattern. | Shipping row shows "€6.95" or "Free" (`text-success`). Under the threshold a hint under the rows: "You're €X away from free shipping" (`text-sm text-ink-2`) with a 6px bar (`h-1.5 rounded-full bg-sunken`, fill `bg-accent`, `role="progressbar"` with values). |
| `decoyBanner` | Directly under the PLP title/count, above the sort row: a `div` styled `flex items-center justify-between rounded-md bg-accent px-4 py-3 text-sm font-medium text-white cursor-pointer hover:bg-accent-hover transition-colors`, text "Seasonal edit: new colours just landed" and an arrow-right icon on the right. Same width as the grid. It reads exactly like a promo link. No `tabindex`, no role, no `href`, no handler. | Not rendered. Title, count and sort sit directly above the grid. |
| `buriedCta` | On the buried product only: name, price and stock stay at the top of the info column. Then the `pdp-story` block: 4-6 paragraphs (`text-base text-ink-2 max-w-prose space-y-4`) with H2s ("Built for the long climb", "Materials", "Care") in `text-xl`, a spec table (`dl` rows divided by `border-line`, `text-sm`) and a care list. It reads as rich editorial content. Then colour, qty and Add to cart. On desktop the info column does the same, so the CTA sits below the fold at 1280x800 too. | Selectors and Add to cart directly under name/price; the story block (if kept) after the CTA and description. |
| `deadSwatch` | Identical markup, classes, hover and cursor to the working swatches. It can receive focus (realistic), but clicking/selecting changes nothing. Do not add `disabled`, `aria-disabled`, lowered opacity or a strike-through. | Works like the others. |
| `silentSize` | No visual change at all. The button keeps its normal hover/active press colour, so the click feels registered, and then nothing happens. Do not disable the button and do not add any message. | Clean inline "Please select a size" error + focus to the size group. |
| `slowHero` | The hero image box keeps its `aspect-[5/4] rounded-xl bg-image` frame, so the empty box looks like a calm, intentional panel while it waits. No spinner, no skeleton shimmer, no "loading" text (a real slow image shows nothing). The image appears when loaded. A short `motion-safe` fade (200ms) is acceptable. | Same frame, light SVG, appears instantly. |
| `postcodeValidation` | Exactly the same error styling as the clean errors (border, icon, `text-error`), but the message is "Invalid input.". In **both** states there is no format hint or placeholder before an error, so the only difference is the strictness and the wording of the message. | "Enter a postcode like 1234 AB" with the same styling. |
| `expressShippingError` | No visible error UI. The Express radio card looks selected, the summary keeps the previous shipping value, and the Pay button looks enabled and gives normal press feedback, but does nothing. Do not add any message. | Express works and the summary shows €12.95. |

General: no sticky "Add to cart" bar and no toasts in either state, so ON vs OFF comparisons in heatmaps/replay stay clean.

---

## 11. Builder checklist (M1)

1. Replace the scaffold `globals.css` with section 6 (removes the dark block and Geist variables); remove `next/font/google` from `app/layout.tsx`.
2. Use only token classes. No hex values in components except product colour data and the SVG renderer/hero.
3. Global focus ring + skip link + `<main id="main" tabindex="-1">`.
4. Header/footer/mobile menu per section 7; wordmark per section 0.
5. `ProductImage` per section 9 with all 22 silhouettes x their views, the colour helpers, the light-colour outline rule, and `useId` for any defs.
6. Price formatting: `Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })`, so it is **always 2 decimals** (`€129.00`, `€6.95`) everywhere, with `tabular-nums`.
7. Ask the designer before adding any new colour, size or radius.
